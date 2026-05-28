import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  normalizePhone,
  sendWhatsAppMessage,
  buildAppointmentLookupSingleMsg,
  buildAppointmentLookupMultipleMsg,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

const TZ = "America/Caracas";
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_MAX = 3;

export async function POST(req: NextRequest) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const rawPhone = (body?.phone ?? "").trim();
  if (!rawPhone || rawPhone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Número de teléfono inválido" }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  const admin = createAdminClient();
  const now = new Date();

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const { data: rateRecord } = await admin
    .from("whatsapp_rate_limit")
    .select("id, attempts, window_start")
    .eq("phone", phone)
    .maybeSingle();

  if (rateRecord) {
    const windowAge = now.getTime() - new Date(rateRecord.window_start).getTime();
    if (windowAge < RATE_WINDOW_MS) {
      if (rateRecord.attempts >= RATE_MAX) {
        return NextResponse.json(
          { error: "Has solicitado demasiadas veces. Espera unos minutos e inténtalo de nuevo." },
          { status: 429 }
        );
      }
      await admin
        .from("whatsapp_rate_limit")
        .update({ attempts: rateRecord.attempts + 1 })
        .eq("id", rateRecord.id);
    } else {
      // Ventana expirada → reiniciar
      await admin
        .from("whatsapp_rate_limit")
        .update({ attempts: 1, window_start: now.toISOString() })
        .eq("id", rateRecord.id);
    }
  } else {
    await admin
      .from("whatsapp_rate_limit")
      .insert({ phone, attempts: 1, window_start: now.toISOString() });
  }

  // ── Buscar clientes con ese teléfono ──────────────────────────────────────
  // Búsqueda flexible: comparar dígitos para tolerar formatos distintos
  const digitsInput = phone.replace(/\D/g, "");

  const { data: allClients } = await admin
    .from("Client")
    .select("id, name, phone");

  const matched = (allClients ?? []).filter((c) => {
    const d = c.phone.replace(/\D/g, "");
    return d === digitsInput || d.endsWith(digitsInput) || digitsInput.endsWith(d);
  });

  if (matched.length === 0) {
    return NextResponse.json({ sent: false, noAppointments: true });
  }

  const clientIds = matched.map((c) => c.id);
  const clientName = matched[0].name ?? "";

  // ── Buscar citas activas/futuras ──────────────────────────────────────────
  const { data: appointments } = await admin
    .from("Appointment")
    .select(`
      id, startTime, rescheduleToken,
      user:User(name),
      service:Service(name)
    `)
    .in("clientId", clientIds)
    .in("status", ["confirmed", "pending"])
    .gte("startTime", now.toISOString())
    .order("startTime", { ascending: true })
    .limit(5);

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: false, noAppointments: true });
  }

  // ── Formatear y enviar WhatsApp ───────────────────────────────────────────
  const formatted = appointments.map((appt) => {
    const start = new Date(appt.startTime);
    const user = Array.isArray(appt.user) ? appt.user[0] : appt.user;
    const service = Array.isArray(appt.service) ? appt.service[0] : appt.service;
    return {
      dateStr: start.toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: TZ,
      }),
      startStr: start.toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TZ,
      }),
      professionalName: (user as { name: string } | null)?.name ?? "",
      serviceName: (service as { name: string } | null)?.name ?? "",
      rescheduleToken: appt.rescheduleToken ?? appt.id,
    };
  });

  const message =
    formatted.length === 1
      ? buildAppointmentLookupSingleMsg({ clientName, ...formatted[0] })
      : buildAppointmentLookupMultipleMsg({ clientName, appointments: formatted });

  await sendWhatsAppMessage(phone, message);

  return NextResponse.json({ sent: true, count: formatted.length });
}
