// Utilidades generales de Musa

import { ProfessionalSettings } from "@/types";

// ─── Slugify ──────────────────────────────────────────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ─── Formatear moneda ─────────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = "USD"
): string {
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  if (currency === "BS") return `Bs. ${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

// ─── Timezone de Venezuela ────────────────────────────────────────────────────
// Venezuela es UTC-4 fijo (sin horario de verano desde mayo 2016).
// Se usa explícitamente en todos los formatos para ser consistentes en servidor
// (Vercel/UTC) y en el navegador.
export const VE_TZ = "America/Caracas";
/** Offset en horas que hay que SUMAR a UTC para obtener medianoche Venezuela.
 *  Venezuela = UTC-4 → medianoche local = 04:00 UTC */
export const VE_UTC_OFFSET_H = 4;

// ─── Formatear fecha en español ───────────────────────────────────────────────
export function formatDateES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-VE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: VE_TZ,
  });
}

export function formatTimeES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: VE_TZ,
  });
}

// ─── Obtener el inicio y fin de un día ───────────────────────────────────────
export function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── Obtener el rango de una semana ──────────────────────────────────────────
export function weekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Lunes
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── Generar slots de tiempo disponibles ─────────────────────────────────────
export interface TimeSlot {
  time: string;      // "09:00"
  datetime: string;  // ISO string
  available: boolean;
}

export function generateTimeSlots(
  date: Date,
  settings: ProfessionalSettings,
  bookedTimes: { startTime: string; endTime: string; durationMin: number }[],
  serviceDuration: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { startHour, endHour, slotDuration, workDays } = settings;

  // ── Verificar día laborable usando la fecha en Venezuela (UTC-4) ──────────
  // Obtenemos el día de la semana interpretando la fecha en Venezuela, no en UTC.
  // Tomamos el UTC-date y le restamos 4 h para ver qué día es en Venezuela.
  const veDate = new Date(date.getTime() - VE_UTC_OFFSET_H * 60 * 60 * 1000);
  const dayOfWeek = veDate.getUTCDay(); // 0=Dom … 6=Sáb en hora Venezuela
  if (!workDays.includes(dayOfWeek)) return [];

  // Convertir HHmm o Hour simple a minutos totales desde medianoche
  const getMinutes = (val: number) => {
    if (val > 24) {
      // Formato HHmm (ej: 930 → 9:30)
      const h = Math.floor(val / 100);
      const m = val % 100;
      return h * 60 + m;
    }
    return val * 60; // Formato Hour simple (ej: 9 → 9:00)
  };

  const startTotalMinutes = getMinutes(startHour);
  const endTotalMinutes   = getMinutes(endHour);

  // ── Medianoche Venezuela en UTC ───────────────────────────────────────────
  // Venezuela = UTC-4 → medianoche Venezuela = 04:00 UTC del mismo día de
  // calendario en Venezuela. "date" llega como UTC midnight del dateStr enviado
  // por el front (YYYY-MM-DD), que representa el día local en Venezuela.
  // Ejemplo: "2026-05-26" → new Date("2026-05-26") = 2026-05-26T00:00:00.000Z (UTC)
  // Medianoche Venezuela de ese mismo día = 2026-05-26T04:00:00.000Z
  const veMidnightUTC = new Date(date);
  veMidnightUTC.setUTCHours(VE_UTC_OFFSET_H, 0, 0, 0);

  // Inicio y fin de jornada en UTC
  let current  = new Date(veMidnightUTC.getTime() + startTotalMinutes * 60_000);
  const endLimit = new Date(veMidnightUTC.getTime() + endTotalMinutes   * 60_000);

  const now = new Date();

  while (current.getTime() + serviceDuration * 60_000 <= endLimit.getTime()) {
    const slotEnd = new Date(current.getTime() + serviceDuration * 60_000);

    // Colisión con citas existentes
    const isBooked = bookedTimes.some(({ startTime, endTime }) => {
      const apptStart = new Date(startTime);
      const apptEnd   = new Date(endTime);
      return current < apptEnd && slotEnd > apptStart;
    });

    // Slots en el pasado (margen de 5 min)
    const isPast = current.getTime() < now.getTime() - 5 * 60_000;

    // Hora visible en Venezuela para el campo `time` (HH:MM local)
    const veHour   = (current.getUTCHours()   - VE_UTC_OFFSET_H + 24) % 24;
    const veMinute = current.getUTCMinutes();
    const hh = String(veHour).padStart(2, "0");
    const mm = String(veMinute).padStart(2, "0");

    slots.push({
      time: `${hh}:${mm}`,
      datetime: current.toISOString(),
      available: !isBooked && !isPast,
    });

    current = new Date(current.getTime() + slotDuration * 60_000);
  }

  return slots;
}

// ─── Color de categoría de servicio ──────────────────────────────────────────
export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    nails: "secondary",
    hair: "primary",
    brows: "tertiary",
    makeup: "tertiary",
    other: "outline",
  };
  return map[category] ?? "primary";
}

// ─── Color de estado de cita ──────────────────────────────────────────────────
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "outline-variant",
    confirmed: "outline-variant",
    completed: "tertiary",
    no_show: "error",
    cancelled: "error",
  };
  return map[status] ?? "outline-variant";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    completed: "Completado",
    no_show: "No-show",
    cancelled: "Cancelado",
  };
  return map[status] ?? status;
}
