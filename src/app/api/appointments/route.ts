// GET  /api/appointments?date=YYYY-MM-DD&from=ISO&to=ISO
// POST /api/appointments
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAppointmentLimit, incrementAppointmentCount } from "@/lib/limits";

const createSchema = z.object({
  clientId: z.string(),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let startFilter: Date;
  let endFilter: Date;

  if (date) {
    startFilter = new Date(date);
    startFilter.setHours(0, 0, 0, 0);
    endFilter = new Date(date);
    endFilter.setHours(23, 59, 59, 999);
  } else if (from && to) {
    startFilter = new Date(from);
    endFilter = new Date(to);
  } else {
    // Default: hoy
    startFilter = new Date();
    startFilter.setHours(0, 0, 0, 0);
    endFilter = new Date();
    endFilter.setHours(23, 59, 59, 999);
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        userId: session.userId,
        startTime: { gte: startFilter, lte: endFilter },
      },
      include: { client: true, service: true, payment: true },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[appointments GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { clientId, serviceId, startTime, notes } = parsed.data;

    // 0. Verificar límites del plan
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });

    if (user?.businessId) {
      const canCreate = await checkAppointmentLimit(user.businessId);
      if (!canCreate) {
        return NextResponse.json(
          { error: "Has alcanzado el límite de citas de tu plan gratuito. Actualiza a PRO para citas ilimitadas." },
          { status: 403 }
        );
      }
    }

    // Obtener duración del servicio
    const service = await prisma.service.findFirst({
      where: { id: serviceId, userId: session.userId },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // Detectar conflicto de horario
    const conflict = await prisma.appointment.findFirst({
      where: {
        userId: session.userId,
        status: { notIn: ["cancelled", "no_show"] },
        OR: [
          { startTime: { gte: start, lt: end } },
          { endTime: { gt: start, lte: end } },
          { startTime: { lte: start }, endTime: { gte: end } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Ya tienes una cita en ese horario" },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId: session.userId,
        clientId,
        serviceId,
        startTime: start,
        endTime: end,
        status: "confirmed",
        notes,
      },
      include: { client: true, service: true },
    });

    // 3. Incrementar contador de citas del negocio
    if (user?.businessId) {
      await incrementAppointmentCount(user.businessId);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("[appointments POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
