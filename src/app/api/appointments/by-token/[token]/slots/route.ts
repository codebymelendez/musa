import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getBlocksInRange, isSlotBlocked } from "@/lib/availability";
import { toLocalDate, dayRangeUTC, parseBusinessHoursToSettings } from "@/lib/utils";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const days = Math.min(
    parseInt(req.nextUrl.searchParams.get("days") ?? "14"),
    60
  );

  console.log(`[slots] Request received for token/id: "${token}"`);
  const supabase = createAdminClient();
  
  // Consulta de la cita
  const { data: appointment, error: appoError } = await supabase
    .from('Appointment')
    .select('id, userId, status, serviceId, rescheduleToken, startTime, endTime')
    .or(`rescheduleToken.eq.${token},id.eq.${token}`)
    .maybeSingle();

  if (appoError) {
    console.error("[slots] Error crítico en DB query:", appoError);
    return NextResponse.json({ error: "Error interno DB", details: appoError.message }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  // Buscar servicio, usuario (para obtener business y timezone) y settings
  const { data: service } = await supabase.from('Service').select('*').eq('id', appointment.serviceId).single();
  const { data: user } = await supabase.from('User').select('businessId, business:Business(timezone)').eq('id', appointment.userId).single();
  const { data: settings } = await supabase.from('ProfessionalSettings').select('*').eq('userId', appointment.userId).single();

  if (!service || !settings || !user) {
    console.log(`[slots] Error: Falta servicio (${!!service}), settings (${!!settings}) o usuario (${!!user})`);
    return NextResponse.json({ error: "Configuración incompleta", slots: [] });
  }

  const serviceDurationMin = service.durationMin;
  const timezone = (user.business as any)?.timezone || "America/Caracas";

  // Query BusinessHours
  let bizHours = null;
  if (user.businessId) {
    const { data } = await supabase
      .from('BusinessHours')
      .select('*')
      .eq('businessId', user.businessId)
      .is('userId', null);
    bizHours = data;
  }
  const computedHours = parseBusinessHoursToSettings(bizHours);

  const today = new Date();
  
  // Definir rango de búsqueda en UTC
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowLocalStr = toLocalDate(tomorrow, timezone);

  const endDay = new Date(today);
  endDay.setDate(endDay.getDate() + days);
  const endLocalStr = toLocalDate(endDay, timezone);

  const { start: startUtcRange } = dayRangeUTC(tomorrowLocalStr, timezone);
  const { end: endUtcRange } = dayRangeUTC(endLocalStr, timezone);

  // Cargar citas existentes del profesional en el rango
  const { data: existingAppointments, error: exError } = await supabase
    .from('Appointment')
    .select('startTime, endTime')
    .eq('userId', appointment.userId)
    .neq('id', appointment.id)
    .not('status', 'in', '(cancelled,no_show)')
    .gte('startTime', startUtcRange)
    .lte('startTime', endUtcRange);

  if (exError) {
    console.error("[slots] Error fetch existing appointments:", exError);
  }

  // Cargar bloqueos de agenda del profesional en el mismo rango
  const activeBlocks = await getBlocksInRange(appointment.userId, new Date(startUtcRange), new Date(endUtcRange));

  const allSlots: { time: string, isAvailable: boolean, isCurrent: boolean }[] = [];

  for (let d = 1; d <= days; d++) {
    const loopDay = new Date(today.getTime());
    loopDay.setDate(loopDay.getDate() + d);

    const dateStr = toLocalDate(loopDay, timezone);
    const [y, m, dayNum] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, dayNum)).getUTCDay();

    // Verificar si el negocio está abierto este día de la semana
    const specificDayHours = bizHours?.find((h: any) => h.dayOfWeek === dayOfWeek);
    const isDayOpen = specificDayHours ? specificDayHours.isOpen : computedHours.workDays.includes(dayOfWeek);

    if (!isDayOpen) continue;

    const openTimeStr = specificDayHours ? specificDayHours.openTime : "09:00";
    const closeTimeStr = specificDayHours ? specificDayHours.closeTime : "18:00";

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);

    const startTotalMinutes = openH * 60 + openM;
    const endTotalMinutes = closeH * 60 + closeM;

    // Obtener medianoche local en UTC para este día
    const { start: dayStartUtcStr } = dayRangeUTC(dateStr, timezone);
    const dayStartUtc = new Date(dayStartUtcStr);

    let minuteOffset = 0;
    while (true) {
      const slotStart = new Date(dayStartUtc.getTime() + (startTotalMinutes + minuteOffset) * 60000);
      const slotEnd = new Date(slotStart.getTime() + serviceDurationMin * 60000);

      const closeTimeLimit = new Date(dayStartUtc.getTime() + endTotalMinutes * 60000);

      // Si el slot excede la hora de cierre, terminamos el día
      if (slotEnd.getTime() > closeTimeLimit.getTime()) break;

      const hasConflict = existingAppointments?.some(
        (existing: any) => {
          const apptStart = new Date(existing.startTime).getTime();
          const apptEnd = new Date(existing.endTime).getTime();
          return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
        }
      );

      const isBlocked = isSlotBlocked(slotStart, slotEnd, activeBlocks);

      const sTime = slotStart.getTime();
      const aStart = new Date(appointment.startTime).getTime();
      const aEnd = new Date(appointment.endTime).getTime();
      const isCurrent = sTime >= aStart && sTime < aEnd;

      allSlots.push({
        time: slotStart.toISOString(),
        isAvailable: !hasConflict && !isBlocked,
        isCurrent: isCurrent
      });

      minuteOffset += settings.slotDuration;
    }
  }

  return NextResponse.json({ slots: allSlots });
}
