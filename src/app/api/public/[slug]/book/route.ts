import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendNotification, sendClientNotification } from "@/lib/notifications";
import { getBlocksInRange, isSlotBlocked } from "@/lib/availability";
import { checkAppointmentLimit } from "@/lib/limits";
import { sendWhatsAppMessage, buildBookingConfirmationMsg, normalizePhone } from "@/lib/whatsapp";
import { rateLimit } from "@/lib/rateLimit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Strict schema: enforce max lengths to prevent oversized payloads and injection attempts.
const bookSchema = z.object({
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  clientName: z.string().min(2).max(100),
  clientPhone: z.string().min(7).max(25),
  clientEmail: z.string().email().max(254).optional().or(z.literal("")),
  wantsNotifications: z.boolean().optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "0.0.0.0";

  // Rate limit 1: global per-IP — 10 booking attempts per 10 min across all professionals.
  // Allows a real user to book at multiple places without friction, blocks burst bots.
  if (!rateLimit(ip, { limit: 10, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Por favor espera unos minutos." },
      { status: 429 }
    );
  }

  // Rate limit 2: per IP+slug — 3 bookings per hour per professional.
  // Prevents a single IP from filling one professional's calendar.
  if (!rateLimit(`${ip}:${slug}`, { limit: 3, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos para esta agenda. Intenta más tarde." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = bookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { serviceId, startTime, clientName, clientPhone, clientEmail, wantsNotifications } =
      parsed.data;
    const admin = createAdminClient();

    // Buscar profesional por slug
    const { data: user, error: userError } = await admin
      .from('User')
      .select('*, settings:ProfessionalSettings(*), business:Business(timezone)')
      .eq('slug', slug)
      .single();

    if (userError || !user) {
      console.error("[book POST] user not found:", slug, userError);
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    let settings = user.settings;
    if (Array.isArray(settings)) {
      settings = settings[0] || null;
    }

    if (settings && settings.bookingEnabled === false) {
      return NextResponse.json(
        { error: "Las reservas están desactivadas" },
        { status: 503 }
      );
    }

    // Verificar servicio
    const { data: service, error: serviceError } = await admin
      .from('Service')
      .select('*')
      .eq('id', serviceId)
      .eq('userId', user.id)
      .eq('isActive', true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // Lógica de solapamiento: (start < existingEnd AND end > existingStart)
    const { data: realConflict } = await admin
      .from('Appointment')
      .select('id')
      .eq('userId', user.id)
      .not('status', 'in', '(cancelled,no_show)')
      .filter('startTime', 'lt', end.toISOString())
      .filter('endTime', 'gt', start.toISOString())
      .limit(1);

    if (realConflict && realConflict.length > 0) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible. Por favor elige otro." },
        { status: 409 }
      );
    }

    // Verificar bloqueos de agenda de la profesional
    const blocks = await getBlocksInRange(user.id, start, end);
    if (isSlotBlocked(start, end, blocks)) {
      return NextResponse.json(
        { error: "Ese horario no está disponible. Por favor elige otro." },
        { status: 409 }
      );
    }

    // Crear o actualizar clienta
    // Primero buscamos si ya existe para evitar problemas de ID con upsert
    const normalizedPhone = normalizePhone(clientPhone);
    const { data: existingClient } = await admin
      .from('Client')
      .select('id')
      .eq('userId', user.id)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    let client;
    if (existingClient) {
      const { data: updatedClient, error: clientUpdateError } = await admin
        .from('Client')
        .update({
          name: clientName,
          email: clientEmail || null,
          wantsNotifications: wantsNotifications ?? false,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingClient.id)
        .select()
        .single();

      if (clientUpdateError || !updatedClient) {
        console.error("[update client]", clientUpdateError);
        return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
      }
      client = updatedClient;
    } else {
      const { data: newClient, error: clientInsertError } = await admin
        .from('Client')
        .insert({
          id: randomUUID(),
          userId: user.id,
          businessId: user.businessId,
          name: clientName,
          phone: normalizedPhone,
          email: clientEmail || null,
          wantsNotifications: wantsNotifications ?? false,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (clientInsertError || !newClient) {
        console.error("[insert client]", clientInsertError);
        return NextResponse.json({ error: "Error al registrar cliente" }, { status: 500 });
      }
      client = newClient;
    }

    // Verificar límite de citas inmediatamente antes del INSERT (reduce ventana de race condition)
    if (user.businessId) {
      const canBook = await checkAppointmentLimit(user.businessId);
      if (!canBook) {
        return NextResponse.json(
          { error: "La agenda de esta profesional está completa para este mes. Por favor contáctala directamente." },
          { status: 503 }
        );
      }
    }

    // Crear cita con token de reschedule
    const rescheduleToken = randomUUID();
    const { data: appointment, error: appoError } = await admin
      .from('Appointment')
      .insert({
        id: randomUUID(),
        userId: user.id,
        clientId: client.id,
        serviceId: service.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "confirmed",
        rescheduleToken,
      })
      .select('*, client:Client(*), service:Service(*)')
      .single();

    if (appoError || !appointment) {
      console.error("[create appointment]", appoError);
      return NextResponse.json({ error: "Error al crear cita" }, { status: 500 });
    }

    const businessObj = Array.isArray(user.business) ? user.business[0] : user.business;
    const TZ = (businessObj as any)?.timezone || "America/Caracas";
    const startStr = start.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
    const dateStr  = start.toLocaleDateString ("es-VE", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

    // Email de confirmación
    if (clientEmail) {
      const manageUrl = `${APP_URL}/cita/${rescheduleToken}`;
      try {
        const { sendEmail } = await import("@/lib/mailer");
        await sendEmail({
          to: clientEmail,
          subject: `✅ Cita confirmada – ${service.name}`,
          html: buildConfirmationEmail({
            clientName,
            serviceName: service.name,
            staffName: user.name,
            dateStr,
            startStr,
            manageUrl,
          }),
        });
      } catch (e) {
        console.error("[Mailer Error]", e);
      }
    }

    // WhatsApp de confirmación — awaited para que Vercel no mate la promesa antes
    // de que Twilio complete la llamada a su API.
    // Usamos clientPhone (input original del formulario) en lugar de client.phone
    // (almacenado en BD como solo dígitos) para preservar el código de país (+34, +1, etc.)
    if (clientPhone) {
      await sendWhatsAppMessage(
        clientPhone,
        buildBookingConfirmationMsg({
          clientName,
          professionalName: user.name,
          serviceName: service.name,
          dateStr,
          startStr,
          rescheduleToken,
        })
      );
    }

    // Notificaciones (Async)
    sendNotification(user.id, {
      title: "Nueva cita confirmada 🗓️",
      body: `${clientName} reservó ${service.name} el ${dateStr} a las ${startStr}`,
      url: "/home",
      appointmentId: appointment.id,
    }).catch(() => {});

    sendClientNotification(client.id, {
      title: "¡Reserva confirmada! ✨",
      body: `Tu cita de ${service.name} con ${user.name} es el ${dateStr} a las ${startStr}.`,
      url: `/p/${slug}`,
      appointmentId: appointment.id,
      tag: `booking-${appointment.id}`,
    }).catch(() => {});

    const formattedAppointment = appointment ? {
      ...appointment,
      client: Array.isArray(appointment.client) ? appointment.client[0] : appointment.client,
      service: Array.isArray(appointment.service) ? appointment.service[0] : appointment.service,
    } : null;

    return NextResponse.json(
      {
        appointment: formattedAppointment,
        clientId: client.id,
        professional: {
          name: user.name,
          whatsapp: user.whatsapp,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[public book POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── Email helpers ─────────────────────────────────────────────────────────────

function buildConfirmationEmail({
  clientName,
  serviceName,
  staffName,
  dateStr,
  startStr,
  manageUrl,
}: {
  clientName: string;
  serviceName: string;
  staffName: string;
  dateStr: string;
  startStr: string;
  manageUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:40px 40px 32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px">Musa ✨</h1>
            <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px">Tu asistente de belleza</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700">¡Cita confirmada! ✅</h2>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
              Hola <strong>${clientName}</strong>, tu reserva está confirmada.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:16px;padding:0;margin:0 0 32px">
              <tr><td style="padding:24px">
                <p style="margin:0 0 8px;color:#7c3aed;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Detalles de tu cita</p>
                <p style="margin:0 0 6px;color:#1a1a2e;font-size:16px;font-weight:700">${serviceName}</p>
                <p style="margin:0 0 4px;color:#6b7280;font-size:14px">👩‍💼 Con ${staffName}</p>
                <p style="margin:0;color:#6b7280;font-size:14px">🗓️ ${dateStr} a las ${startStr}</p>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:50px;text-align:center">
                  <a href="${manageUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">
                    👉 Gestionar mi cita
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;text-align:center">
              Desde ese link puedes cambiar la fecha o cancelar cuando quieras.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#faf5ff;border-top:1px solid #ede9fe;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">© 2026 Musa. Todos los derechos reservados.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
