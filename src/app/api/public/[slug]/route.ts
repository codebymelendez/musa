import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { generateTimeSlots, dayRangeUTC, DEFAULT_TZ, parseBusinessHoursToSettings } from "@/lib/utils";
import { ProfessionalSettings } from "@/types";
import { getBlocksInRange } from "@/lib/availability";
import { escapeIlike } from "@/lib/slug";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const dateParam = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  try {
    const admin = createAdminClient();

    // El slug público canónico es Business.slug: resolver el negocio y de ahí
    // su dueña (User) con servicios + settings
    const { data: bizRows, error: bizError } = await admin
      .from('Business')
      .select('id, name, slug, timezone, logoUrl, coverUrl, city, address, currency, country')
      .ilike('slug', escapeIlike(slug))
      .limit(1);
    const biz = bizRows?.[0];

    if (bizError || !biz) {
      console.error("[public slug GET] business not found for slug:", slug, bizError);
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    // Dueña primero ('owner' < 'staff' alfabéticamente); hoy la relación es 1:1
    const { data: userRows, error: userError } = await admin
      .from('User')
      .select('*, services:Service(*), settings:ProfessionalSettings(*)')
      .eq('businessId', biz.id)
      .in('appRole', ['owner', 'staff'])
      .eq('Service.isActive', true)
      .order('appRole', { ascending: true })
      .limit(1);
    const user = userRows?.[0];

    if (userError || !user) {
      console.error("[public slug GET] user not found for business:", biz.id, userError);
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    // Fotos del negocio (galería) para el perfil público
    const { data: bizPhotos } = await admin
      .from('BusinessPhoto')
      .select('id, url, sortOrder')
      .eq('businessId', biz.id)
      .eq('type', 'gallery')
      .order('sortOrder', { ascending: true });

    // Supabase might return a single object or an array for settings depending on constraints
    let rawSettings = user.settings;
    if (Array.isArray(rawSettings)) {
      rawSettings = rawSettings[0] || null;
    }

    // Query BusinessHours
    const { data: bizHours } = await admin
      .from('BusinessHours')
      .select('*')
      .eq('businessId', biz.id)
      .is('userId', null);
    const computedHours = parseBusinessHoursToSettings(bizHours);

    const businessTz = biz.timezone || rawSettings?.timezone || DEFAULT_TZ;

    const settings = {
      workDays: computedHours.workDays,
      startHour: computedHours.startHour,
      endHour: computedHours.endHour,
      slotDuration: rawSettings?.slotDuration ?? 30,
      // Business.currency es la fuente de verdad; ProfessionalSettings.currency es legacy
      currency: biz.currency ?? rawSettings?.currency ?? "USD",
      bookingEnabled: rawSettings?.bookingEnabled ?? true,
      timezone: businessTz,
    };

    if (settings.bookingEnabled === false) {
      return NextResponse.json(
        { error: "Las reservas están temporalmente desactivadas" },
        { status: 503 }
      );
    }

    // Slots disponibles
    let slots = null;
    if (dateParam && serviceId) {
      const selectedDate = new Date(dateParam);
      const bizTz = settings.timezone;
      const { start, end } = dayRangeUTC(dateParam, bizTz);

      const services = user.services || [];
      const selectedService = services.find((s: any) => s.id === serviceId);
      if (!selectedService) {
        return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
      }

      const dayOfWeek = selectedDate.getUTCDay();
      const specificDayHours = bizHours?.find((h: any) => h.dayOfWeek === dayOfWeek);
      const isDayOpen = specificDayHours ? specificDayHours.isOpen : settings.workDays.includes(dayOfWeek);

      let rawSlots: any[] = [];

      if (isDayOpen) {
        const parseToHhmmInt = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 100 + m;
        };

        const dayStartHour = specificDayHours ? parseToHhmmInt(specificDayHours.openTime) : settings.startHour;
        const dayEndHour = specificDayHours ? parseToHhmmInt(specificDayHours.closeTime) : settings.endHour;

        const daySettings = {
          ...settings,
          startHour: dayStartHour,
          endHour: dayEndHour,
        };

        // Citas existentes en el día
        const { data: bookedAppointments, error: appointmentsError } = await admin
          .from('Appointment')
          .select('startTime, endTime, service:Service(durationMin)')
          .eq('userId', user.id)
          .not('status', 'in', '(cancelled,no_show)')
          .gte('startTime', start)
          .lte('startTime', end);

        if (appointmentsError) {
          console.error("[fetch appointments error]", appointmentsError);
        }

        rawSlots = generateTimeSlots(
          selectedDate,
          daySettings as unknown as ProfessionalSettings,
          (bookedAppointments || []).map((a: any) => ({
            startTime: a.startTime,
            endTime: a.endTime,
            durationMin: a.service?.durationMin || 0,
          })),
          selectedService.durationMin,
          bizTz
        );
      }

      // Excluir slots bloqueados por la profesional
      const activeBlocks = await getBlocksInRange(user.id, new Date(start), new Date(end));
      if (activeBlocks.length > 0) {
        slots = rawSlots.map((slot) => {
          if (!slot.available) return slot;
          const slotStart = new Date(slot.datetime);
          const slotEnd = new Date(slotStart.getTime() + selectedService.durationMin * 60000);
          const isBlocked = activeBlocks.some(
            (b) => slotStart < new Date(b.endTime) && slotEnd > new Date(b.startTime)
          );
          return isBlocked ? { ...slot, available: false, blocked: true } : slot;
        });
      } else {
        slots = rawSlots;
      }
    }

    return NextResponse.json({
      professional: {
        name: user.name,
        slug: biz.slug, // canónico: Business.slug
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        serviceType: user.serviceType,
        whatsapp: user.whatsapp,
        instagram: user.instagram,
      },
      business: {
        name: biz.name,
        slug: biz.slug,
        logoUrl: biz.logoUrl ?? null,
        coverUrl: biz.coverUrl ?? null,
        city: biz.city ?? null,
        address: biz.address ?? null,
        currency: biz.currency ?? "USD",
        photos: bizPhotos ?? [],
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
