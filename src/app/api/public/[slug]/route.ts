import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { generateTimeSlots, dayRange } from "@/lib/utils";
import { ProfessionalSettings } from "@/types";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const dateParam = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  try {
    const admin = createAdminClient();

    // Buscar profesional por slug + servicios + settings
    const { data: user, error: userError } = await admin
      .from('User')
      .select('*, services:Service(*), settings:ProfessionalSettings(*)')
      .eq('slug', slug)
      .eq('Service.isActive', true)
      .single();

    if (userError || !user) {
      console.error("[public slug GET] user not found for slug:", slug, userError);
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    const rawSettings = user.settings;
    const settings = rawSettings
      ? { ...rawSettings, workDays: typeof rawSettings.workDays === 'string' ? JSON.parse(rawSettings.workDays) : rawSettings.workDays }
      : {
          workDays: [1, 2, 3, 4, 5],
          startHour: 9,
          endHour: 18,
          slotDuration: 30,
          currency: "USD",
          bookingEnabled: true,
        };

    if (!settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Las reservas están temporalmente desactivadas" },
        { status: 503 }
      );
    }

    // Slots disponibles
    let slots = null;
    if (dateParam && serviceId) {
      const selectedDate = new Date(dateParam);
      const { start, end } = dayRange(selectedDate);

      const services = user.services || [];
      const selectedService = services.find((s: any) => s.id === serviceId);
      if (!selectedService) {
        return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
      }

      // Citas existentes en el día
      const { data: bookedAppointments, error: appointmentsError } = await admin
        .from('Appointment')
        .select('startTime, endTime, service:Service(durationMin)')
        .eq('userId', user.id)
        .not('status', 'in', '("cancelled","no_show")')
        .gte('startTime', start.toISOString())
        .lte('startTime', end.toISOString());

      if (appointmentsError) {
        console.error("[fetch appointments error]", appointmentsError);
      }

      slots = generateTimeSlots(
        selectedDate,
        settings as ProfessionalSettings,
        (bookedAppointments || []).map((a: any) => ({
          startTime: a.startTime,
          endTime: a.endTime,
          durationMin: a.service?.durationMin || 0,
        })),
        selectedService.durationMin
      );
    }

    return NextResponse.json({
      professional: {
        name: user.name,
        slug: user.slug,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        serviceType: user.serviceType,
        whatsapp: user.whatsapp,
        instagram: user.instagram,
      },
      services: user.services,
      settings,
      slots,
    });
  } catch (error) {
    console.error("[public slug GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
