import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase-server";
import { sendNotification, sendClientNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const bookSchema = z.object({
  serviceId: z.string(),
  startTime: z.string().datetime(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(7),
  clientEmail: z.string().email().optional().or(z.literal("")),
  wantsNotifications: z.boolean().optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

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
    const supabase = await createClient();

    // Buscar profesional por slug
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*, settings:ProfessionalSettings(*)')
      .eq('slug', slug)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    const settings = user.settings;
    if (settings && !settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Las reservas están desactivadas" },
        { status: 503 }
      );
    }

    // Verificar servicio
    const { data: service, error: serviceError } = await supabase
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

    // Conflicto de horario
    // Nota: La lógica de OR en Supabase se hace con .or()
    const { data: conflict, error: conflictError } = await supabase
      .from('Appointment')
      .select('id')
      .eq('userId', user.id)
      .not('status', 'in', '("cancelled","no_show")')
      .or(`startTime.gte.${start.toISOString()},startTime.lt.${end.toISOString()}`)
      .limit(1);

    // Ajuste: La lógica de solapamiento más completa es (start < existingEnd AND end > existingStart)
    // Pero mantendremos la lógica original aproximada o la mejoraremos si es posible.
    // Lógica original: OR [ { gte: start, lt: end }, { gt: start, lte: end }, { lte: start, gte: end } ]
    
    // Simplificado para Supabase:
    const { data: realConflict } = await supabase
      .from('Appointment')
      .select('id')
      .eq('userId', user.id)
      .not('status', 'in', '("cancelled","no_show")')
      .filter('startTime', 'lt', end.toISOString())
      .filter('endTime', 'gt', start.toISOString())
      .limit(1);

    if (realConflict && realConflict.length > 0) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible. Por favor elige otro." },
        { status: 409 }
      );
    }

    // Crear o actualizar clienta
    // Upsert requiere un índice único o restricción. En Prisma era userId_phone.
    const { data: client, error: clientError } = await supabase
      .from('Client')
      .upsert({
        id: randomUUID(),
        userId: user.id,
        businessId: user.businessId,
        name: clientName,
        phone: clientPhone,
        email: clientEmail || null,
        wantsNotifications: wantsNotifications ?? false,
      }, { onConflict: 'userId,phone' })
      .select()
      .single();

    if (clientError || !client) {
      console.error("[upsert client]", clientError);
      return NextResponse.json({ error: "Error al registrar cliente" }, { status: 500 });
    }

    // Crear cita con token de reschedule
    const rescheduleToken = randomUUID();
    const { data: appointment, error: appoError } = await supabase
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

    const startStr = start.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
    const dateStr = start.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });

    // Email de confirmación
    if (clientEmail) {
      const manageUrl = `${APP_URL}/cita/${rescheduleToken}`;
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: "Musa <noreply@musa.app>",
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
      }).catch(() => {});
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

    return NextResponse.json(
      {
        appointment,
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
            <p style="margin:0;color:#9ca3af;font-size:12px">© 2025 Musa. Todos los derechos reservados.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
