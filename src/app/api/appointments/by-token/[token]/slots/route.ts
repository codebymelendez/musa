import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const days = Math.min(
    parseInt(req.nextUrl.searchParams.get("days") ?? "14"),
    60
  );

  const supabase = createAdminClient();
  const { data: appointment } = await supabase
    .from('Appointment')
    .select('*, service:Service(*), user:User(*, settings:ProfessionalSettings(*))')
    .eq('rescheduleToken', token)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return NextResponse.json({ error: "Cita no modificable" }, { status: 409 });
  }

  const settings = appointment.user?.settings;
  if (!settings) {
    return NextResponse.json({ slots: [] });
  }

  const workDays: number[] = JSON.parse(settings.workDays);
  const { startHour, endHour, slotDuration } = settings;
  const serviceDurationMin = appointment.service.durationMin;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() + 1);
  from.setHours(0, 0, 0, 0);

  const until = new Date(from);
  until.setDate(until.getDate() + days);
  until.setHours(23, 59, 59, 999);

  const { data: existingAppointments } = await supabase
    .from('Appointment')
    .select('startTime, endTime')
    .eq('userId', appointment.userId)
    .neq('id', appointment.id)
    .not('status', 'in', '(cancelled,no_show)')
    .gte('startTime', from.toISOString())
    .lte('startTime', until.toISOString());

  const availableSlots: string[] = [];

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

      if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) break;
      if (slotStart.getHours() >= endHour) break;

      const hasConflict = existingAppointments?.some(
        (existing) =>
          slotStart < new Date(existing.endTime) && slotEnd > new Date(existing.startTime)
      );

      if (!hasConflict) {
        availableSlots.push(slotStart.toISOString());
      }

      minuteOffset += slotDuration;
    }
  }

  return NextResponse.json({ slots: availableSlots });
}
