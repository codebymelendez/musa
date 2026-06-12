/**
 * GET /api/cron/reminders
 *
 * Cron job (pg_cron en Supabase, cada 5 min; disparo manual vía
 * .github/workflows/reminders.yml → workflow_dispatch).
 * Envía dos recordatorios por cita confirmada:
 *   - 24h antes (ventana: ahora+22h → ahora+24h), marcado en reminder24hSentAt
 *   - 2h antes  (ventana: ahora+1h  → ahora+2h),  marcado en reminder2hSentAt
 * Canales (ahorro de costes de Twilio): si la clienta tiene suscripción push
 * y wantsNotifications, SOLO push + in-app; WhatsApp queda como respaldo
 * cuando no hay push posible. La columna reminderSent (bool) está DEPRECADA.
 *
 * Protegido por CRON_SECRET para que solo el cron pueda invocarlo.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  sendWhatsAppMessage,
  buildReminderMsg,
  buildReminder2hMsg,
} from "@/lib/whatsapp";
import { sendClientNotification } from "@/lib/notifications";

export const runtime = "nodejs"; // Twilio requiere Node.js, no Edge

const DEFAULT_TZ = "America/Caracas";
const HOUR = 60 * 60 * 1000;

const APPOINTMENT_SELECT = `
  id, startTime, createdAt, rescheduleToken, businessTimezone,
  client:Client(id, name, phone, wantsNotifications),
  user:User(id, name, business:Business(timezone)),
  service:Service(name)
`;

type ReminderKind = "24h" | "2h";

interface ReminderClient {
  id: string;
  name: string;
  phone: string | null;
  wantsNotifications: boolean | null;
}
interface ReminderUser {
  id: string;
  name: string | null;
  business: { timezone: string | null } | { timezone: string | null }[] | null;
}
interface ReminderAppointment {
  id: string;
  startTime: string;
  createdAt: string | null;
  rescheduleToken: string | null;
  businessTimezone: string | null;
  client: ReminderClient | ReminderClient[] | null;
  user: ReminderUser | ReminderUser[] | null;
  service: { name: string } | { name: string }[] | null;
}

function one<T>(rel: T | T[] | null | undefined): T | null {
  return Array.isArray(rel) ? rel[0] ?? null : rel ?? null;
}

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
  const now = new Date();

  const counters = { reminded24h: 0, reminded2h: 0, skipped: 0, failed: 0 };

  // ── Query ventana 24h: ahora+22h < startTime <= ahora+24h ─────────────
  const { data: appts24h, error: error24h } = await admin
    .from("Appointment")
    .select(APPOINTMENT_SELECT)
    .eq("status", "confirmed")
    .is("reminder24hSentAt", null)
    .gt("startTime", new Date(now.getTime() + 22 * HOUR).toISOString())
    .lte("startTime", new Date(now.getTime() + 24 * HOUR).toISOString());

  // ── Query ventana 2h: ahora+1h < startTime <= ahora+2h ────────────────
  const { data: appts2h, error: error2h } = await admin
    .from("Appointment")
    .select(APPOINTMENT_SELECT)
    .eq("status", "confirmed")
    .is("reminder2hSentAt", null)
    .gt("startTime", new Date(now.getTime() + 1 * HOUR).toISOString())
    .lte("startTime", new Date(now.getTime() + 2 * HOUR).toISOString());

  if (error24h || error2h) {
    console.error("[cron/reminders] DB error:", error24h ?? error2h);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  async function processAppointment(appt: ReminderAppointment, kind: ReminderKind) {
    const sentAtColumn = kind === "24h" ? "reminder24hSentAt" : "reminder2hSentAt";

    try {
      // Regla 24h: si la cita se creó con menos de 24h de antelación, no
      // tiene sentido un recordatorio de "mañana". Se marca reminder24hSentAt
      // igualmente (skip registrado, no envío) para no re-evaluarla en cada run.
      if (kind === "24h" && appt.createdAt) {
        const createdAt = new Date(appt.createdAt).getTime();
        const startTime = new Date(appt.startTime).getTime();
        if (createdAt > startTime - 24 * HOUR) {
          const { error: skipError } = await admin
            .from("Appointment")
            .update({ [sentAtColumn]: new Date().toISOString() })
            .eq("id", appt.id);
          if (skipError) throw skipError;
          counters.skipped++;
          return;
        }
      }

      const client = one(appt.client);
      const user = one(appt.user);
      const service = one(appt.service);
      const business = one(user?.business);

      // Prioridad: Appointment.businessTimezone → Business.timezone → default
      const tz = appt.businessTimezone || business?.timezone || DEFAULT_TZ;
      const start = new Date(appt.startTime);
      const dateStr = start.toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: tz,
      });
      const startStr = start.toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      });

      let anyChannelSent = false;

      // Canal preferido: push (gratis). WhatsApp (Twilio, de pago) solo como
      // respaldo cuando la clienta no puede recibir push.
      let hasPushSubscription = false;
      if (client?.id) {
        const { count } = await admin
          .from("PushSubscription")
          .select("id", { count: "exact", head: true })
          .eq("clientId", client.id);
        hasPushSubscription = (count ?? 0) > 0;
      }

      if (client?.id && client.wantsNotifications === true && hasPushSubscription) {
        // a) Push + notificación in-app — sin WhatsApp
        const result = await sendClientNotification(client.id, {
          title:
            kind === "24h"
              ? "Recordatorio de tu cita mañana"
              : "Tu cita es en 2 horas",
          body: `${service?.name ?? "Tu cita"} con ${user?.name ?? ""} — ${dateStr} a las ${startStr}`,
          url: `/cita/${appt.rescheduleToken ?? appt.id}`,
          appointmentId: appt.id,
          tag: `reminder-${kind}-${appt.id}`,
        });
        if (result) anyChannelSent = true;
      } else if (client?.phone) {
        // b) WhatsApp de respaldo (sendWhatsAppMessage nunca lanza: traga errores)
        const buildMsg = kind === "24h" ? buildReminderMsg : buildReminder2hMsg;
        await sendWhatsAppMessage(
          client.phone,
          buildMsg({
            clientName: client.name,
            professionalName: user?.name ?? "",
            dateStr,
            startStr,
            rescheduleToken: appt.rescheduleToken ?? appt.id,
          })
        );
        anyChannelSent = true;
      }

      if (!anyChannelSent) return; // sin canales disponibles: no marcar

      const { error: updateError } = await admin
        .from("Appointment")
        .update({ [sentAtColumn]: new Date().toISOString() })
        .eq("id", appt.id);
      if (updateError) throw updateError;

      if (kind === "24h") counters.reminded24h++;
      else counters.reminded2h++;
    } catch (err) {
      console.error(
        `[cron/reminders] Error procesando cita ${appt.id} (${kind}):`,
        err
      );
      counters.failed++;
    }
  }

  for (const appt of appts24h ?? []) {
    await processAppointment(appt, "24h");
  }
  for (const appt of appts2h ?? []) {
    await processAppointment(appt, "2h");
  }

  return NextResponse.json({ ok: true, ...counters });
}
