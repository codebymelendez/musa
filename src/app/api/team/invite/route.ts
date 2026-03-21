// POST   /api/team/invite -> Crear invitación
// GET    /api/team/invites -> Listar invitaciones
// DELETE /api/team/invite/[id] -> Revocar invitación

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true },
    });

    if (user?.role !== "OWNER" || !user.businessId) {
      return NextResponse.json({ error: "Solo el dueño puede invitar personal" }, { status: 403 });
    }

    // Generar token único y código alfanumérico corto
    const token = nanoid(32);
    const code = nanoid(8).toUpperCase();

    const invitation = await prisma.invitation.create({
      data: {
        businessId: user.businessId,
        token,
        code,
        role: "STAFF",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });

    return NextResponse.json(invitation);
  } catch (error) {
    console.error("[team invite POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });

    if (!user?.businessId) return NextResponse.json([]);

    const invitations = await prisma.invitation.findMany({
      where: { 
        businessId: user.businessId,
        usedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("[team invite GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
