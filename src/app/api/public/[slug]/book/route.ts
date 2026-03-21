// POST /api/public/[slug]/book
// Crear reserva pública (sin autenticación del profesional).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

const bookSchema = z.object({
  serviceId: z.string(),
  startTime: z.string().datetime(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(7),
  clientEmail: z.string().email().optional().or(z.literal("")),
});

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  try {
    const body = await req.json();
    const parsed = bookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { serviceId, startTime, clientName, clientPhone, clientEmail } =
      parsed.data;

    // Verificar que el profesional y el servicio existen
    const user = await prisma.user.findUnique({
      where: { slug },
      include: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Profesional no encontrada" }, { status: 404 });
    }

    const settings = user.settings;
    if (settings && !settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Las reservas están desactivadas" },
        { status: 503 }
      );
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, userId: user.id, isActive: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // Verificar que la hora no esté ocupada
    const conflict = await prisma.appointment.findFirst({
      where: {
        userId: user.id,
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
        { error: "Ese horario ya no está disponible. Por favor elige otro." },
        { status: 409 }
      );
    }

    // Crear o buscar clienta
    const client = await prisma.client.upsert({
      where: { userId_phone: { userId: user.id, phone: clientPhone } },
      update: { name: clientName, email: clientEmail || null },
      create: {
        userId: user.id,
        name: clientName,
        phone: clientPhone,
        email: clientEmail || null,
      },
    });

    // Crear cita
    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        serviceId: service.id,
        startTime: start,
        endTime: end,
        status: "confirmed",
      },
      include: { client: true, service: true },
    });

    // Notificar al profesional de la nueva reserva
    const startStr = start.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
    const dateStr = start.toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" });
    sendNotification(user.id, {
      title: "Nueva cita confirmada",
      body: `${clientName} reservó ${service.name} el ${dateStr} a las ${startStr}`,
      url: "/home",
    }).catch(() => {}); // no bloquear la respuesta

    return NextResponse.json(
      {
        appointment,
        professional: {
          name: user.name,
          whatsapp: user.whatsapp,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[public book POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
