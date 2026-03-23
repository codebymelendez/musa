// POST /api/appointments/[id]/action?action=confirm|cancel
// Invocado desde el Service Worker cuando la clienta pulsa botón en la push notification.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendClientNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");

  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, user: true, client: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const newStatus = action === "confirm" ? "confirmed" : "cancelled";

    await prisma.appointment.update({
      where: { id },
      data: { status: newStatus },
    });

    // Notificar al profesional del cambio
    const startStr = appointment.startTime.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (action === "cancel") {
      await sendClientNotification(appointment.clientId, {
        title: "Cita cancelada",
        body: `Tu cita de ${appointment.service.name} el ${startStr} fue cancelada.`,
        url: `/p/${appointment.user.slug}`,
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[appointment action POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
