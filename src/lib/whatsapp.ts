/**
 * WhatsApp automático via Twilio
 * Usa la Twilio WhatsApp Sandbox en desarrollo y el número aprobado en producción.
 *
 * Variables de entorno requeridas:
 *   TWILIO_ACCOUNT_SID   — Account SID de Twilio
 *   TWILIO_AUTH_TOKEN    — Auth Token de Twilio
 *   TWILIO_WHATSAPP_FROM — número origen, p.ej. "whatsapp:+14155238886" (sandbox)
 *                          o "whatsapp:+58XXXXXXXXXX" (número aprobado)
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getmusa.app";

// ── Normaliza un número venezolano a formato E.164 ─────────────────────────
// Acepta: "04241234567", "4241234567", "+584241234567", "584241234567"
function normalizeVEPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("58")) return `+${digits}`;
  if (digits.startsWith("0")) return `+58${digits.slice(1)}`;
  return `+58${digits}`;
}

// ── Envío genérico ─────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(
  toPhone: string,
  message: string
): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

  if (!sid || !token) {
    console.warn("[WhatsApp] Credenciales de Twilio no configuradas — mensaje omitido.");
    return;
  }

  const to = `whatsapp:${normalizeVEPhone(toPhone)}`;

  try {
    // Importación dinámica para que Twilio no afecte el bundle del cliente
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);

    await client.messages.create({ from, to, body: message });
    console.log(`[WhatsApp] Mensaje enviado a ${to}`);
  } catch (err) {
    // Un fallo de WhatsApp NUNCA debe interrumpir el flujo principal
    console.error("[WhatsApp] Error al enviar mensaje:", err);
  }
}

// ── Mensajes predefinidos ──────────────────────────────────────────────────

export function buildBookingConfirmationMsg({
  clientName,
  professionalName,
  serviceName,
  dateStr,
  startStr,
  rescheduleToken,
}: {
  clientName: string;
  professionalName: string;
  serviceName: string;
  dateStr: string;
  startStr: string;
  rescheduleToken: string;
}) {
  return (
    `¡Hola ${clientName}! 💅 Tu cita está confirmada con ${professionalName}.\n\n` +
    `📅 ${dateStr} a las ${startStr}\n` +
    `✂️ Servicio: ${serviceName}\n\n` +
    `Ver o cancelar tu cita:\n` +
    `👉 ${APP_URL}/cita/${rescheduleToken}\n\n` +
    `— Equipo MUSA`
  );
}

export function buildReminderMsg({
  clientName,
  professionalName,
  dateStr,
  startStr,
  rescheduleToken,
}: {
  clientName: string;
  professionalName: string;
  dateStr: string;
  startStr: string;
  rescheduleToken: string;
}) {
  return (
    `¡Hola ${clientName}! Te recordamos tu cita mañana 💅\n\n` +
    `📅 ${dateStr} a las ${startStr}\n` +
    `💇 Con: ${professionalName}\n\n` +
    `Si necesitas cancelar:\n` +
    `👉 ${APP_URL}/cita/${rescheduleToken}\n\n` +
    `— Equipo MUSA`
  );
}

export function buildCancellationMsg({
  clientName,
  professionalName,
  dateStr,
  startStr,
}: {
  clientName: string;
  professionalName: string;
  dateStr: string;
  startStr: string;
}) {
  return (
    `Hola ${clientName}. Tu cita del ${dateStr} a las ${startStr} ` +
    `con ${professionalName} ha sido cancelada correctamente.\n\n` +
    `Puedes reservar una nueva cita cuando quieras en getmusa.app 🗓️\n\n` +
    `— Equipo MUSA`
  );
}
