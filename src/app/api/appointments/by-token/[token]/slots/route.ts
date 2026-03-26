import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const days = Math.min(
    parseInt(req.nextUrl.searchParams.get("days") ?? "14"),
    60
  );

  console.log(`[slots] Request received for token/id: "${token}"`);
  const supabase = createAdminClient();
  
  // Consulta ultra-simplificada para descartar errores de joins
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
    console.log(`[slots] Cita NO encontrada en DB para "${token}". Consultando tabla completa para depurar...`);
    // Opcional: ver si la tabla tiene algo
    const { count } = await supabase.from('Appointment').select('*', { count: 'exact', head: true });
    console.log(`[slots] Total citas en tabla Appointment: ${count}`);
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  console.log(`[slots] Cita encontrada OK: ID=${appointment.id}, User=${appointment.userId}.`);
  
  // Ahora buscamos el servicio y settings por separado
  const { data: service } = await supabase.from('Service').select('*').eq('id', appointment.serviceId).single();
  const { data: settings } = await supabase.from('ProfessionalSettings').select('*').eq('userId', appointment.userId).single();

  if (!service || !settings) {
    console.log(`[slots] Error: Falta servicio (${!!service}) o settings (${!!settings})`);
    return NextResponse.json({ error: "Configuración incompleta", slots: [] });
  }

  const serviceDurationMin = service.durationMin;

  const workDays: number[] = JSON.parse(settings.workDays);
  const { startHour, endHour, slotDuration } = settings;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() + 1);
  from.setHours(0, 0, 0, 0);

  const until = new Date(from);
  until.setDate(until.getDate() + days);
  until.setHours(23, 59, 59, 999);

  const { data: existingAppointments, error: exError } = await supabase
    .from('Appointment')
    .select('startTime, endTime')
    .eq('userId', appointment.userId)
    // EXCLUIMOS la cita actual para que el usuario pueda ver huecos libres si se moviera
    .neq('id', appointment.id)
    .not('status', 'in', '(cancelled,no_show)')
    .gte('startTime', from.toISOString())
    .lte('startTime', until.toISOString());

  if (exError) {
    console.error("[slots] Error fetch existing appointments:", exError);
  }

  const allSlots: { time: string, isAvailable: boolean, isCurrent: boolean }[] = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);

    const dayOfWeek = day.getDay();
    if (!workDays.includes(dayOfWeek)) continue;

    let minuteOffset = 0;
    while (true) {
      const slotStart = new Date(day);
      slotStart.setHours(startHour, 0, 0, 0);
      slotStart.setMinutes(slotStart.getMinutes() + minuteOffset);

      const slotEnd = new Date(slotStart.getTime() + serviceDurationMin * 60000);

      // Si el slot excede la hora de cierre, terminamos el día
      if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) break;
      if (slotStart.getHours() >= endHour) break;

      const hasConflict = existingAppointments?.some(
        (existing) =>
          slotStart < new Date(existing.endTime) && slotEnd > new Date(existing.startTime)
      );

      const sTime = new Date(slotStart).getTime();
      const aStart = new Date(appointment.startTime).getTime();
      const aEnd = new Date(appointment.endTime).getTime();
      const isCurrent = sTime >= aStart && sTime < aEnd;

      allSlots.push({
        time: slotStart.toISOString(),
        isAvailable: !hasConflict,
        isCurrent: isCurrent
      });

      minuteOffset += slotDuration;
    }
  }

  return NextResponse.json({ slots: allSlots });
}
