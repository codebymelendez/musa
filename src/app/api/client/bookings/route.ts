// GET /api/client/bookings
// Devuelve todas las citas de la clienta identificada por JWT.
// Authorization: Bearer <token>
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/clientAuth";

export async function GET(req: NextRequest) {
  const session = await getClientSession(req.headers.get("authorization"));
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        client: { phone: session.clientPhone },
      },
      include: {
        service: {
          select: { name: true, durationMin: true, price: true, currency: true },
        },
        user: {
          select: {
            name: true,
            slug: true,
            avatarUrl: true,
            serviceType: true,
            whatsapp: true,
            business: { select: { name: true, city: true } },
          },
        },
        client: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    // Separar próximas y pasadas
    const now = new Date();
    const upcoming = appointments.filter(
      (a) => new Date(a.startTime) >= now && a.status !== "cancelled"
    );
    const past = appointments.filter(
      (a) => new Date(a.startTime) < now || a.status === "cancelled"
    );

    return NextResponse.json({
      clientName: session.clientName,
      upcoming,
      past,
      total: appointments.length,
    });
  } catch (error) {
    console.error("[client bookings GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
