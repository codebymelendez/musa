// GET  /api/notifications        – lista notificaciones del usuario autenticado
// PATCH /api/notifications        – marca notificación(es) como leídas
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[notifications GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, readAll } = body;

    if (readAll) {
      await prisma.notification.updateMany({
        where: { userId: session.userId, read: false },
        data: { read: true, readAt: new Date() },
      });
    } else if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: session.userId },
        data: { read: true, readAt: new Date() },
      });
    } else {
      return NextResponse.json({ error: "Parámetro id o readAll requerido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
