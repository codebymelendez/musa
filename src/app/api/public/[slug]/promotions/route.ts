// GET /api/public/[slug]/promotions
// Devuelve promos activas del negocio para mostrar en la página pública de reservas.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: { businessId: true },
    });

    if (!user?.businessId) {
      return NextResponse.json({ promotions: [] });
    }

    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        businessId: user.businessId,
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { discount: "desc" },
      take: 3,
    });

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("[public promotions GET]", error);
    return NextResponse.json({ promotions: [] });
  }
}
