import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendEmail } from "@/lib/mailer";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendNotification, sendClientNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const rescheduleSchema = z.object({
  token: z.string().min(1),
  newStartTime: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = rescheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { token, newStartTime } = parsed.data;
    const supabase = createAdminClient();

    // Buscamos por rescheduleToken o ID
    const { data: appointment, error: aError } = await supabase
      .from('Appointment')
      .select('*, client:Client(*), service:Service(*), user:User(id, name, email, slug)')
      .or(`rescheduleToken.eq.${token},id.eq.${token}`)
      .maybeSingle();

    if (aError) {
      console.error("[reschedule portal] DB Error:", aError);
      return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
    }

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Esta cita no se puede reprogramar" },
        { status: 409 }
      );
    }

    const newStart = new Date(newStartTime);
    const newEnd = new Date(
      newStart.getTime() + appointment.service.durationMin * 60000
    );

    // Verificar que el nuevo horario está libre (excluyendo la cita actual)
    const { data: conflict, error: cError } = await supabase
      .from('Appointment')
      .select('id')
      .eq('userId', appointment.userId)
      .neq('id', appointment.id)
      .not('status', 'in', '(cancelled,no_show,pending)') // Corregida sintaxis Supabase para 'in'
      .filter('startTime', 'lt', newEnd.toISOString())
      .filter('endTime', 'gt', newStart.toISOString())
      .limit(1)
      .maybeSingle();

    if (cError) {
      console.error("[reschedule] Conflict check error:", cError);
    }

    if (conflict) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible. Elige otro." },
        { status: 409 }
      );
    }

    // Regenerar token para el nuevo link de gestión
    const newToken = randomUUID();

    const { data: updated, error: updateError } = await supabase
      .from('Appointment')
      .update({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        status: "reprogrammed",
        oldStartTime: appointment.startTime,
        oldEndTime: appointment.endTime,
        rescheduleToken: newToken,
      })
      .eq('id', appointment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    const oldStartTime = new Date(appointment.startTime);
    const oldDateStr = oldStartTime.toLocaleDateString("es-VE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const oldTimeStr = oldStartTime.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const newDateStr = newStart.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const newTimeStr = newStart.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newManageUrl = `${APP_URL}/cita/${newToken}`;

    // Push al profesional
    sendNotification(appointment.userId, {
      title: "Cita reprogramada 📅",
      body: `${appointment.client.name} movió su cita de ${oldDateStr}/${oldTimeStr} → ${newDateStr}/${newTimeStr}`,
      url: "/home",
      appointmentId: appointment.id,
    }).catch(() => {});

    // Push a la clienta
    sendClientNotification(appointment.clientId, {
      title: "¡Cita reprogramada! ✅",
      body: `Tu cita de ${appointment.service.name} ahora es el ${newDateStr} a las ${newTimeStr}.`,
      url: newManageUrl,
      appointmentId: appointment.id,
      tag: `reschedule-${appointment.id}`,
    }).catch(() => {});

    // Email a la clienta
    if (appointment.client.email) {
      sendEmail({
        to: appointment.client.email,
        subject: `✅ Cita reprogramada – ${appointment.service.name}`,
        html: buildClientRescheduleEmail({
          clientName: appointment.client.name,
          serviceName: appointment.service.name,
          staffName: appointment.user.name,
          newDateStr,
          newTimeStr,
          manageUrl: newManageUrl,
        }),
      }).catch(() => {});
    }

    // Email al profesional
    if (appointment.user.email) {
      sendEmail({
        to: appointment.user.email,
        subject: `📅 Cita reprogramada – ${appointment.client.name}`,
        html: buildStaffRescheduleEmail({
          clientName: appointment.client.name,
          serviceName: appointment.service.name,
          oldDateStr,
          oldTimeStr,
          newDateStr,
          newTimeStr,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      newToken,
      newManageUrl,
      appointment: updated,
    });
  } catch (error) {
    console.error("[reschedule POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── Email helpers ─────────────────────────────────────────────────────────────

function buildClientRescheduleEmail({
  clientName,
  serviceName,
  staffName,
  newDateStr,
  newTimeStr,
  manageUrl,
}: {
  clientName: string;
  serviceName: string;
  staffName: string;
  newDateStr: string;
  newTimeStr: string;
  manageUrl: string;
}) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.08)">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Musa ✨</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#1a1a2e">¡Cita reprogramada! ✅</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
            Hola <strong>${clientName}</strong>, tu cita ha sido reprogramada exitosamente.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:16px;margin:0 0 32px">
            <tr><td style="padding:24px">
              <p style="margin:0 0 8px;color:#7c3aed;font-size:13px;font-weight:600;text-transform:uppercase">Nueva fecha</p>
              <p style="margin:0 0 6px;color:#1a1a2e;font-size:16px;font-weight:700">${serviceName}</p>
              <p style="margin:0 0 4px;color:#6b7280;font-size:14px">👩‍💼 Con ${staffName}</p>
              <p style="margin:0;color:#6b7280;font-size:14px">🗓️ ${newDateStr} a las ${newTimeStr}</p>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:50px;text-align:center">
              <a href="${manageUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none">
                👉 Gestionar mi cita
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#faf5ff;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© 2026 Musa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildStaffRescheduleEmail({
  clientName,
  serviceName,
  oldDateStr,
  oldTimeStr,
  newDateStr,
  newTimeStr,
}: {
  clientName: string;
  serviceName: string;
  oldDateStr: string;
  oldTimeStr: string;
  newDateStr: string;
  newTimeStr: string;
}) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.08)">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Musa ✨</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#1a1a2e">Cita reprogramada 📅</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
            <strong>${clientName}</strong> ha reprogramado su cita de <strong>${serviceName}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:16px;margin:0 0 16px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;text-transform:uppercase;font-weight:600">Antes</p>
              <p style="margin:0;color:#6b7280;font-size:15px;text-decoration:line-through">${oldDateStr} – ${oldTimeStr}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ede9fe;border-radius:16px;margin:0 0 24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 4px;color:#7c3aed;font-size:12px;text-transform:uppercase;font-weight:600">Ahora</p>
              <p style="margin:0;color:#1a1a2e;font-size:16px;font-weight:700">${newDateStr} – ${newTimeStr}</p>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px">Tu agenda se ha actualizado automáticamente.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#faf5ff;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© 2026 Musa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
