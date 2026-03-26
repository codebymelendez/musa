import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendNotification, sendClientNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Buscamos por rescheduleToken o por ID
  const { data: appointment, error: aError } = await supabase
    .from('Appointment')
    .select('*, client:Client(*), service:Service(*), user:User(id, name, slug, whatsapp, email, settings:ProfessionalSettings(*))')
    .or(`rescheduleToken.eq.${token},id.eq.${token}`)
    .maybeSingle();

  if (aError) {
    console.error("[appointment portal] DB Error:", aError);
    return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Buscamos por rescheduleToken o por ID
  const { data: appointment, error: dError } = await supabase
    .from('Appointment')
    .select('*, client:Client(*), service:Service(*), user:User(id, name, email, slug)')
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

  const { error: updateError } = await supabase
    .from('Appointment')
    .update({ status: "cancelled" })
    .eq('id', appointment.id);

  if (updateError) throw updateError;

  const startTime = new Date(appointment.startTime);
  const dateStr = startTime.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startStr = startTime.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Push al profesional
  sendNotification(appointment.userId, {
    title: "Cita cancelada ❌",
    body: `${appointment.client.name} canceló su cita de ${appointment.service.name} el ${dateStr} a las ${startStr}`,
    url: "/home",
    appointmentId: appointment.id,
  }).catch(() => {});

  // Push a la clienta
  sendClientNotification(appointment.clientId, {
    title: "Cita cancelada",
    body: `Tu cita de ${appointment.service.name} el ${dateStr} fue cancelada.`,
    url: `/p/${appointment.user.slug}`,
    appointmentId: appointment.id,
  }).catch(() => {});

  // Email al profesional si tiene email
  if (appointment.user.email) {
    sendEmail({
      to: appointment.user.email,
      subject: `❌ Cita cancelada – ${appointment.client.name}`,
      html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Musa ✨</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1a1a2e">Cita cancelada ❌</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6">
            <strong>${appointment.client.name}</strong> canceló su cita de <strong>${appointment.service.name}</strong>
            programada para el <strong>${dateStr} a las ${startStr}</strong>.
          </p>
          <p style="color:#9ca3af;font-size:13px">El hueco vuelve a estar disponible en tu agenda.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#faf5ff;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© 2025 Musa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    }).catch(() => {});
  }

  // Email a la clienta si tiene email
  if (appointment.client.email) {
    sendEmail({
      to: appointment.client.email,
      subject: "Cita cancelada – Musa",
      html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Musa ✨</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1a1a2e">Tu cita fue cancelada</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6">
            Hola <strong>${appointment.client.name}</strong>, tu cita de <strong>${appointment.service.name}</strong>
            con <strong>${appointment.user.name}</strong> programada para el
            <strong>${dateStr} a las ${startStr}</strong> ha sido cancelada.
          </p>
          <p style="color:#6b7280;font-size:15px">Puedes reservar una nueva cita cuando quieras.</p>
          <table cellpadding="0" cellspacing="0" style="margin:24px auto 0">
            <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:50px;text-align:center">
              <a href="${APP_URL}/p/${appointment.user.slug}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none">
                Reservar nueva cita
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#faf5ff;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© 2025 Musa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
