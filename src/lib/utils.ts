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

// ─── Formatear fecha en español ───────────────────────────────────────────────
export function formatDateES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-VE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTimeES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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

  // Verificar si el día es laborable
  const dayOfWeek = date.getDay();
  if (!workDays.includes(dayOfWeek)) return [];

  let current = new Date(date);
  current.setHours(startHour, 0, 0, 0);

  const endLimit = new Date(date);
  endLimit.setHours(endHour, 0, 0, 0);

  while (current < endLimit) {
    const slotEnd = new Date(current.getTime() + serviceDuration * 60000);

    // No mostrar slots que terminarían después del cierre
    if (slotEnd > endLimit) break;

    // Verificar si el slot colisiona con una cita existente
    const isBooked = bookedTimes.some(({ startTime, endTime }) => {
      const apptStart = new Date(startTime);
      const apptEnd = new Date(endTime);
      return current < apptEnd && slotEnd > apptStart;
    });

    // No mostrar slots en el pasado
    const isPast = current < new Date();

    const hh = current.getHours().toString().padStart(2, "0");
    const mm = current.getMinutes().toString().padStart(2, "0");

    slots.push({
      time: `${hh}:${mm}`,
      datetime: current.toISOString(),
      available: !isBooked && !isPast,
    });

    current = new Date(current.getTime() + slotDuration * 60000);
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
