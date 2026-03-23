// GET  /api/promotions        → lista promos del negocio del usuario
// POST /api/promotions        → crear nueva promo
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  discount: z.number().min(1).max(100),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  targetUserId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });

    if (!user?.businessId) {
      return NextResponse.json({ promotions: [] });
    }

    const promotions = await prisma.promotion.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("[promotions GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true },
    });

    if (user?.role !== "OWNER") {
      return NextResponse.json({ error: "Solo el propietario puede crear promociones" }, { status: 403 });
    }

    if (!user.businessId) {
      return NextResponse.json({ error: "Sin negocio asignado" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const promotion = await prisma.promotion.create({
      data: {
        ...parsed.data,
        businessId: user.businessId,
        validFrom: new Date(parsed.data.validFrom),
        validUntil: new Date(parsed.data.validUntil),
      },
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("[promotions POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
