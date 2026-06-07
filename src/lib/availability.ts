/**
 * availability.ts
 * Helpers para bloqueos de agenda. Usados por el motor de slots y las APIs.
 */

import { createAdminClient } from "@/lib/supabase-admin";
import { AvailabilityBlock } from "@/types";

/**
 * Retorna todos los bloques activos de un usuario en un rango de fechas.
 */
export async function getBlocksInRange(
  userId: string,
  from: Date,
  to: Date
): Promise<AvailabilityBlock[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("AvailabilityBlock")
    .select("*")
    .eq("userId", userId)
    .lt("startTime", to.toISOString())
    .gt("endTime", from.toISOString())
    .order("startTime", { ascending: true });

  if (error) {
    console.error("[availability] getBlocksInRange error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Comprueba si un slot concreto (slotStart, slotEnd) está bloqueado
 * por alguno de los bloques activos.
 */
export function isSlotBlocked(
  slotStart: Date,
  slotEnd: Date,
  blocks: AvailabilityBlock[]
): boolean {
  return blocks.some((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

/**
 * Detecta qué citas confirmadas/pendientes se solapan con un bloqueo propuesto.
 * Útil para mostrar advertencias antes de guardar.
 */
export async function detectConflictingAppointments(
  userId: string,
  startTime: Date,
  endTime: Date
) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("Appointment")
    .select("id, startTime, endTime, status, client:Client(name)")
    .eq("userId", userId)
    .not("status", "in", "(cancelled,no_show)")
    .lt("startTime", endTime.toISOString())
    .gt("endTime", startTime.toISOString())
    .order("startTime", { ascending: true });

  return (data ?? []).map((apt: any) => ({
    ...apt,
    client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
  }));
}
