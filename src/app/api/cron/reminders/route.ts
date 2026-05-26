/**
 * GET /api/cron/reminders
 *
 * Cron job que se ejecuta cada hora (configurado en vercel.json).
 * Busca citas confirmadas dentro de las próximas 24 h que no hayan
 * recibido recordatorio y envía WhatsApp a cada clienta.
 *
 * Protegido por CRON_SECRET para que solo Vercel Cron pueda invocarlo.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendWhatsAppMessage, buildReminderMsg } from "@/lib/whatsapp";

export const runtime = "nodejs"; // Twilio requiere Node.js, no Edge

export async function GET(req: NextRequest) {
  // ── Autenticación del cron ─────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();

  // Ventana: ahora + 23 h → ahora + 25 h  (así cubrimos citas "a 24 h")
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: appointments, error } = await admin
    .from("Appointment")
    .select(
      `id, startTime, rescheduleToken, reminderSent,
       client:Client(id, name, phone),
       user:User(id, name)`
    )
    .eq("status", "confirmed")
    .eq("reminderSent", false)
    .gte("startTime", windowStart.toISOString())
    .lte("startTime", windowEnd.toISOString());

  if (error) {
    console.error("[cron/reminders] DB error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    console.log("[cron/reminders] No hay citas para recordar en esta ventana.");
    return NextResponse.json({ ok: true, reminded: 0 });
  }

  let reminded = 0;
  let failed = 0;

  for (const appt of appointments) {
    const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
    const user = Array.isArray(appt.user) ? appt.user[0] : appt.user;

    if (!client?.phone) continue;

    const start = new Date(appt.startTime);
    const TZ = "America/Caracas";
    const dateStr = start.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: TZ,
    });
    const startStr = start.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    });

    try {
      await sendWhatsAppMessage(
        client.phone,
        buildReminderMsg({
          clientName: client.name,
          professionalName: user?.name ?? "",
          dateStr,
          startStr,
          rescheduleToken: appt.rescheduleToken ?? appt.id,
        })
      );

      // Marcar como recordado
      const { error: updateError } = await admin
        .from("Appointment")
        .update({ reminderSent: true })
        .eq("id", appt.id);

      if (updateError) {
        console.error(`[cron/reminders] No se pudo marcar cita ${appt.id}:`, updateError);
        failed++;
      } else {
        reminded++;
      }
    } catch (err) {
      console.error(`[cron/reminders] Error enviando recordatorio para cita ${appt.id}:`, err);
      failed++;
    }
  }

  console.log(`[cron/reminders] reminded=${reminded}, failed=${failed}`);
  return NextResponse.json({ ok: true, reminded, failed });
}
