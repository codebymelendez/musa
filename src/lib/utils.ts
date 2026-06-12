// Utilidades generales de Musa

import { ProfessionalSettings } from "@/types";
import { formatPrice } from "@/lib/currency";

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
// Delegado a formatPrice (src/lib/currency.ts) — único punto de formateo de precios.
export function formatCurrency(amount: number, currency = "USD"): string {
  return formatPrice(amount, currency);
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
export function formatDateES(date: Date | string, tz?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const safeTz = tz ? getSafeTimezone(tz) : VE_TZ;
  return d.toLocaleDateString("es-VE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: safeTz,
  });
}

export function formatTimeES(date: Date | string, tz?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const safeTz = tz ? getSafeTimezone(tz) : VE_TZ;
  return d.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: safeTz,
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
  serviceDuration: number,
  tz: string = DEFAULT_TZ
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { startHour, endHour, slotDuration, workDays } = settings;

  // ── Verificar día laborable usando la timezone del negocio ──────────────
  // "date" es una fecha en medianoche UTC que representa la fecha local (YYYY-MM-DD).
  // getUTCDay() nos da el día de la semana correcto e independiente de desfases locales.
  const dayOfWeek = date.getUTCDay();
  if (!workDays.includes(dayOfWeek)) return [];

  const offsetH = getUTCOffsetHours(tz);

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
  // Se calcula en milisegundos directamente para soportar desfases fraccionarios (ej: India UTC+5:30)
  const veMidnightUTC = new Date(date.getTime() + offsetH * 60 * 60 * 1000);

  // Inicio y fin de jornada en UTC
  let current  = new Date(veMidnightUTC.getTime() + startTotalMinutes * 60_000);
  const endLimit = new Date(veMidnightUTC.getTime() + endTotalMinutes   * 60_000);

  const now = new Date();

  // Guard: null durationMin from DB makes serviceDuration = 0, which degenerates
  // the condition to slotStart <= closeTime. Fall back to slotDuration.
  const effectiveDuration = serviceDuration > 0 ? serviceDuration : slotDuration;
  while (current.getTime() + effectiveDuration * 60_000 <= endLimit.getTime()) {
    const slotEnd = new Date(current.getTime() + effectiveDuration * 60_000);

    // Colisión con citas existentes
    const isBooked = bookedTimes.some(({ startTime, endTime }) => {
      const apptStart = new Date(startTime);
      const apptEnd   = new Date(endTime);
      return current < apptEnd && slotEnd > apptStart;
    });

    // Slots en el pasado (margen de 5 min)
    const isPast = current.getTime() < now.getTime() - 5 * 60_000;

    // Hora visible en Venezuela para el campo `time` (HH:MM local)
    const veHour   = (current.getUTCHours()   - offsetH + 24) % 24;
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

// ─── DEFAULT_TZ ───────────────────────────────────────────────────────────────
export const DEFAULT_TZ = 'America/Caracas';

// ─── getSafeTimezone ──────────────────────────────────────────────────────────
// Devuelve una zona horaria válida garantizada para evitar excepciones de RangeError.
export function getSafeTimezone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

// ─── parseSupa ────────────────────────────────────────────────────────────────
// Supabase devuelve TIMESTAMP(3) sin Z ("2026-06-09T13:00:00").
// new Date() sin Z lo interpreta como hora local del browser → desfase de N horas.
// parseSupa fuerza interpretación UTC, igual que normalizeISODate en la app móvil.
export function parseSupa(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

// ─── getUTCOffsetHours ────────────────────────────────────────────────────────
// Horas que hay que SUMAR a UTC midnight para obtener medianoche local en `tz`.
// Venezuela (UTC-4) → 4.  España verano (UTC+2) → -2.  India (UTC+5:30) → -5.5.
// Misma convención que VE_UTC_OFFSET_H para mantener compatibilidad.
// Nota: refleja el offset en el momento de la llamada; no cubre días de cambio de DST.
export function getUTCOffsetHours(tz: string): number {
  const safeTz = getSafeTimezone(tz);
  const now    = new Date();
  const utcStr = now.toLocaleString('sv-SE', { timeZone: 'UTC' });
  const tzStr  = now.toLocaleString('sv-SE', { timeZone: safeTz });
  const utcMs  = new Date(utcStr.replace(' ', 'T') + 'Z').getTime();
  const tzMs   = new Date(tzStr.replace(' ', 'T')  + 'Z').getTime();
  return (utcMs - tzMs) / 3_600_000;
}

// ─── toLocalDate ──────────────────────────────────────────────────────────────
// Retorna "YYYY-MM-DD" del Date interpretado en la timezone dada.
export function toLocalDate(date: Date, tz: string): string {
  const safeTz = getSafeTimezone(tz);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: safeTz }).format(date);
}

// ─── dayRangeUTC ─────────────────────────────────────────────────────────────
// Dado "YYYY-MM-DD" (fecha local en tz), retorna el rango UTC completo de ese día:
//   start = medianoche local en UTC  (ISO con Z)
//   end   = 23:59:59.999 local en UTC (ISO con Z)
// Ejemplo: dayRangeUTC("2026-06-09", "America/Caracas")
//   → { start: "2026-06-09T04:00:00.000Z", end: "2026-06-10T03:59:59.999Z" }
export function dayRangeUTC(
  dateStr: string,
  tz: string
): { start: string; end: string } {
  const safeTz = getSafeTimezone(tz);
  const offsetH = getUTCOffsetHours(safeTz);
  const baseMs  = new Date(`${dateStr}T00:00:00.000Z`).getTime();
  const startMs = baseMs + offsetH * 3_600_000;
  return {
    start: new Date(startMs).toISOString(),
    end:   new Date(startMs + 86_400_000 - 1).toISOString(),
  };
}

// ─── weekRangeUTC ─────────────────────────────────────────────────────────────
// Retorna el rango lunes–domingo de la semana que contiene `date`, en UTC,
// calculado según la timezone del negocio.
// Ejemplo: weekRangeUTC(new Date("2026-06-09T15:00:00Z"), "America/Caracas")
//   → { start: "2026-06-08T04:00:00.000Z", end: "2026-06-15T03:59:59.999Z" }
export function weekRangeUTC(
  date: Date,
  tz: string
): { start: string; end: string } {
  const safeTz = getSafeTimezone(tz);
  const localStr  = toLocalDate(date, safeTz);
  const [y, mo, d] = localStr.split('-').map(Number);
  const pivot      = new Date(Date.UTC(y, mo - 1, d));
  const dow        = pivot.getUTCDay();
  const toMonday   = dow === 0 ? -6 : 1 - dow;
  const monday     = new Date(pivot.getTime() + toMonday * 86_400_000);
  const sunday     = new Date(monday.getTime() + 6       * 86_400_000);
  const { start }  = dayRangeUTC(monday.toISOString().slice(0, 10), safeTz);
  const { end }    = dayRangeUTC(sunday.toISOString().slice(0, 10), safeTz);
  return { start, end };
}

// ─── formatDateTZ ─────────────────────────────────────────────────────────────
// Parsea un string de Supabase con parseSupa y formatea en la timezone dada.
// locale fijo 'es-VE' — solo cambia la zona horaria, no el idioma.
export function formatDateTZ(
  dateStr: string,
  tz: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }
): string {
  const safeTz = getSafeTimezone(tz);
  return parseSupa(dateStr).toLocaleDateString('es-VE', { ...opts, timeZone: safeTz });
}

// ─── parseBusinessHoursToSettings ──────────────────────────────────────────────
// Reconstruye workDays, startHour y endHour a partir de BusinessHours para compatibilidad.
export interface BusinessHoursRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export function parseBusinessHoursToSettings(hours: BusinessHoursRow[] | null) {
  if (!hours || hours.length === 0) {
    return {
      workDays: [1, 2, 3, 4, 5],
      startHour: 900,
      endHour: 1800,
    };
  }

  const openDays = hours.filter(h => h.isOpen);
  if (openDays.length === 0) {
    return {
      workDays: [],
      startHour: 900,
      endHour: 1800,
    };
  }

  // Ordenar los días por día de la semana (1-6, 0 para domingo al final o al inicio)
  // Usar el mismo orden para que sea predecible
  const workDays = openDays.map(h => h.dayOfWeek).sort((a, b) => a - b);

  const parseToHhmmInt = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 100 + m;
  };

  const openTimeInts = openDays.map(h => parseToHhmmInt(h.openTime));
  const closeTimeInts = openDays.map(h => parseToHhmmInt(h.closeTime));

  const startHour = Math.min(...openTimeInts);
  const endHour = Math.max(...closeTimeInts);

  return {
    workDays,
    startHour,
    endHour,
  };
}
