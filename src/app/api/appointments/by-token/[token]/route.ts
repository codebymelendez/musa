import { NextRequest, NextResponse, after } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendNotification, sendClientNotification } from "@/lib/notifications";
import { sendWhatsAppMessage, buildCancellationMsg } from "@/lib/whatsapp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Params = { params: Promise<{ token: string }> };

// Token expira 24h después del inicio de la cita
function isTokenExpired(startTime: string): boolean {
  const expiresAt = new Date(startTime).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: appointment, error: aError } = await supabase
    .from('Appointment')
    .select(`
      *,
      client:Client(*),
      service:Service(*),
      user:User(id, name, slug, whatsapp, email, avatarUrl, businessId,
        settings:ProfessionalSettings(*),
        business:Business(name, city, currency)
      )
    `)
    .or(`rescheduleToken.eq.${token},id.eq.${token}`)
    .maybeSingle();

  if (aError) {
    console.error("[appointment portal] DB Error:", aError);
    return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  // Normalizar relaciones one-to-one
  const user = Array.isArray(appointment.user) ? appointment.user[0] : appointment.user;
  const business = user?.business
    ? (Array.isArray(user.business) ? user.business[0] : user.business)
    : null;

  // Verificar expiración (solo si la cita no está ya cancelada/completada)
  if (!["cancelled", "completed", "no_show"].includes(appointment.status)) {
    if (isTokenExpired(appointment.startTime)) {
      return NextResponse.json({ error: "Este enlace ha expirado", expired: true }, { status: 410 });
    }
  }

  const client = Array.isArray(appointment.client) ? appointment.client[0] : appointment.client;
  const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service;
  const payment = Array.isArray(appointment.payment) ? appointment.payment[0] : appointment.payment;

  // Fidelización: programa activo del negocio + cuenta de ESTA clienta.
  // Solo se serializan los campos mínimos — nunca datos de otras clientas.
  let loyalty: {
    program: {
      name: string;
      accumulationType: string;
      pointsPerVisit: number;
      rewardThreshold: number;
      rewardDescription: string;
    };
    account: { totalPoints: number; qrToken: string } | null;
  } | null = null;

  if (user?.businessId && appointment.clientId) {
    const { data: program } = await supabase
      .from("LoyaltyProgram")
      .select("name, accumulationType, pointsPerVisit, rewardThreshold, rewardDescription")
      .eq("businessId", user.businessId)
      .eq("isActive", true)
      .maybeSingle();

    if (program) {
      const { data: account } = await supabase
        .from("ClientLoyaltyAccount")
        .select("totalPoints, qrToken")
        .eq("businessId", user.businessId)
        .eq("clientId", appointment.clientId)
        .maybeSingle();

      loyalty = {
        program,
        account: account ? { totalPoints: account.totalPoints, qrToken: account.qrToken } : null,
      };
    }
  }

  return NextResponse.json({
    ...appointment,
    client,
    service,
    payment,
    loyalty,
    user: {
      ...user,
      business,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: appointment, error: dError } = await supabase
    .from('Appointment')
    .select('*, client:Client(*), service:Service(*), user:User(id, name, email, slug, avatarUrl)')
    .or(`rescheduleToken.eq.${token},id.eq.${token}`)
    .maybeSingle();

  if (dError) {
    console.error("[appointment portal DELETE] DB Error:", dError);
    return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return NextResponse.json(
      { error: "Esta cita no se puede cancelar" },
      { status: 409 }
    );
  }

  // Verificar expiración
  if (isTokenExpired(appointment.startTime)) {
    return NextResponse.json({ error: "Este enlace ha expirado" }, { status: 410 });
  }

  const { error: updateError } = await supabase
    .from('Appointment')
    .update({ status: "cancelled" })
    .eq('id', appointment.id);

  if (updateError) throw updateError;

  const user = Array.isArray(appointment.user) ? appointment.user[0] : appointment.user;
  const client = Array.isArray(appointment.client) ? appointment.client[0] : appointment.client;
  const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service;

  const TZ = appointment.businessTimezone || "America/Caracas";
  const startTime = new Date(appointment.startTime);
  const dateStr = startTime.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
  const startStr = startTime.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

  // WhatsApp, push y emails — after() para que Vercel no congele las promesas al responder
  after(async () => {
    // WhatsApp de cancelación a la clienta
    if (client?.phone) {
      try {
        await sendWhatsAppMessage(
          client.phone,
          buildCancellationMsg({
            clientName: client.name,
            professionalName: user?.name ?? "",
            dateStr,
            startStr,
          })
        );
      } catch (error) {
        console.error("[appointments by-token] whatsapp failed", error);
      }
    }

    // Push al profesional y a la clienta
    try {
      await sendNotification(appointment.userId, {
        title: "Cita cancelada ❌",
        body: `${client?.name} canceló su cita de ${service?.name} el ${dateStr} a las ${startStr}`,
        url: "/home",
        appointmentId: appointment.id,
      });

      await sendClientNotification(appointment.clientId, {
        title: "Cita cancelada",
        body: `Tu cita de ${service?.name} el ${dateStr} fue cancelada.`,
        // DEPRECATED: User.slug legacy — el canónico es Business.slug (redirige vía SlugHistory)
        url: `/p/${user?.slug}`,
        appointmentId: appointment.id,
      });
    } catch (error) {
      console.error("[appointments by-token] push notification failed", error);
    }

    // Email al profesional si tiene email
    if (user?.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: `❌ Cita cancelada – ${client?.name}`,
          html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6ee;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6ee;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden">
        <tr><td style="background:#1A0E0B;padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#F2EBE0;font-size:22px;font-weight:600;letter-spacing:-0.3px">Musa</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1A0E0B">Cita cancelada ❌</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6">
            <strong>${client?.name}</strong> canceló su cita de <strong>${service?.name}</strong>
            programada para el <strong>${dateStr} a las ${startStr}</strong>.
          </p>
          <p style="color:#9ca3af;font-size:13px">El hueco vuelve a estar disponible en tu agenda.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#fdf6ee;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© 2026 Musa · getmusa.app</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        });
      } catch (error) {
        console.error("[appointments by-token] staff email failed", error);
      }
    }

    // Email a la clienta si tiene email
    if (client?.email) {
      try {
        await sendEmail({
          to: client.email,
          subject: "Cita cancelada – Musa",
          html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6ee;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6ee;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden">
        <tr><td style="background:#1A0E0B;padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#F2EBE0;font-size:22px;font-weight:600;letter-spacing:-0.3px">Musa</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1A0E0B">Tu cita fue cancelada</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6">
            Hola <strong>${client?.name}</strong>, tu cita de <strong>${service?.name}</strong>
            con <strong>${user?.name}</strong> programada para el
            <strong>${dateStr} a las ${startStr}</strong> ha sido cancelada.
          </p>
          <p style="color:#6b7280;font-size:15px">Puedes reservar una nueva cita cuando quieras.</p>
          <table cellpadding="0" cellspacing="0" style="margin:24px auto 0">
            <tr><td style="background:#B5593E;border-radius:50px;text-align:center">
              <!-- DEPRECATED: User.slug legacy — el canónico es Business.slug (redirige vía SlugHistory) -->
              <a href="${APP_URL}/p/${user?.slug}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                Reservar nueva cita →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#fdf6ee;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© 2026 Musa · getmusa.app</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        });
      } catch (error) {
        console.error("[appointments by-token] client email failed", error);
      }
    }
  });

  return NextResponse.json({ ok: true });
}
