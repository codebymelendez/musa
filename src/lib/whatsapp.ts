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

// ── Normaliza un número de teléfono a formato E.164 ───────────────────────
// Reglas:
//   1. Si el número empieza con "+" → ya tiene código de país, se respeta tal cual.
//   2. Si empieza con "00" → prefijo internacional, se convierte a "+" (ej. 0034 → +34).
//   3. Si empieza con "0" (pero no "00") → formato local venezolano, se añade +58.
//   4. Sin prefijo → se asume Venezuela (+58) como mercado principal.
//
// Ejemplos:
//   "+34637087616"   → "+34637087616"   (España, respetado)
//   "+584241234567"  → "+584241234567"  (Venezuela con +, respetado)
//   "0034637087616"  → "+34637087616"   (prefijo 00)
//   "04241234567"    → "+584241234567"  (local venezolano con 0)
//   "4241234567"     → "+584241234567"  (local venezolano sin 0)
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();

  // Caso 1: ya tiene "+" → solo limpiar caracteres no numéricos y devolver
  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");

  // Caso 2: prefijo internacional "00XX..."
  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  // Caso 3: formato local venezolano "04XX..." → quitar 0 y añadir +58
  if (digits.startsWith("0")) {
    return `+58${digits.slice(1)}`;
  }

  // Caso 4: solo dígitos sin prefijo → asumir Venezuela
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

  const to = `whatsapp:${normalizePhone(toPhone)}`;
  console.log(`[WhatsApp] from="${from}" to="${to}"`);

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

export function buildAppointmentLookupSingleMsg({
  clientName,
  dateStr,
  startStr,
  professionalName,
  serviceName,
  rescheduleToken,
}: {
  clientName: string;
  dateStr: string;
  startStr: string;
  professionalName: string;
  serviceName: string;
  rescheduleToken: string;
}) {
  return (
    `¡Hola${clientName ? ` ${clientName}` : ""}! Aquí tienes el acceso a tu cita en MUSA 💅\n\n` +
    `📅 ${dateStr} a las ${startStr}\n` +
    `💇 Con: ${professionalName}\n` +
    `✂️ Servicio: ${serviceName}\n\n` +
    `Ver o cancelar tu cita:\n` +
    `👉 ${APP_URL}/cita/${rescheduleToken}\n\n` +
    `— Equipo MUSA`
  );
}

export function buildAppointmentLookupMultipleMsg({
  clientName,
  appointments,
}: {
  clientName: string;
  appointments: Array<{
    dateStr: string;
    startStr: string;
    professionalName: string;
    rescheduleToken: string;
  }>;
}) {
  const ordinals = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  const lines = appointments
    .map(
      (appt, i) =>
        `${ordinals[i] ?? `${i + 1}.`} ${appt.dateStr} · ${appt.startStr} · ${appt.professionalName}\n` +
        `👉 ${APP_URL}/cita/${appt.rescheduleToken}`
    )
    .join("\n\n");
  return (
    `¡Hola${clientName ? ` ${clientName}` : ""}! Tienes ${appointments.length} citas próximas en MUSA 💅\n\n` +
    lines +
    `\n\n— Equipo MUSA`
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
