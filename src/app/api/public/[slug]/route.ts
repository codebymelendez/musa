// GET /api/public/[slug]?date=YYYY-MM-DD&serviceId=...
// Devuelve perfil público + servicios + slots disponibles en una fecha dada.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTimeSlots, dayRange } from "@/lib/utils";
import { ProfessionalSettings } from "@/types";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const dateParam = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  try {
    const user = await prisma.user.findUnique({
      where: { slug },
      include: {
        services: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    const settings = user.settings
      ? { ...user.settings, workDays: JSON.parse(user.settings.workDays) }
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

    // Slots disponibles si se solicita una fecha + servicio
    let slots = null;
    if (dateParam && serviceId) {
      const selectedDate = new Date(dateParam);
      const { start, end } = dayRange(selectedDate);

      const selectedService = user.services.find((s) => s.id === serviceId);
      if (!selectedService) {
        return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
      }

      // Citas existentes en el día
      const bookedAppointments = await prisma.appointment.findMany({
        where: {
          userId: user.id,
          status: { notIn: ["cancelled", "no_show"] },
          startTime: { gte: start, lte: end },
        },
        select: { startTime: true, endTime: true, service: { select: { durationMin: true } } },
      });

      slots = generateTimeSlots(
        selectedDate,
        settings as ProfessionalSettings,
        bookedAppointments.map((a) => ({
          startTime: a.startTime.toISOString(),
          endTime: a.endTime.toISOString(),
          durationMin: a.service.durationMin,
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
