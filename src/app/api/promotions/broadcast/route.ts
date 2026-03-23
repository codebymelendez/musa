// POST /api/promotions/broadcast
// Envía push de una promo a todas las clientas del negocio con opt-in.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToBusinessClients } from "@/lib/notifications";

const schema = z.object({
  promotionId: z.string().cuid(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true },
    });

    if (user?.role !== "OWNER") {
      return NextResponse.json({ error: "Solo el propietario puede enviar promos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: parsed.data.promotionId },
    });

    if (!promotion || promotion.businessId !== user.businessId) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    await broadcastToBusinessClients(user.businessId!, {
      title: `✨ ${promotion.title}`,
      body: promotion.description,
      url: `/p/${session.slug}`,
      tag: `promo-${promotion.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[promotions broadcast POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
