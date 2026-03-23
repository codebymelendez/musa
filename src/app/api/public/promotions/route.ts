// GET /api/public/promotions
// Devuelve todas las promociones activas de todos los negocios.
// Usada en la home page pública para descubrir ofertas.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        business: {
          include: {
            users: {
              where: { role: "OWNER" },
              select: {
                name: true,
                slug: true,
                avatarUrl: true,
                serviceType: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { discount: "desc" },
      take: 12,
    });

    const result = promotions.map((p) => {
      const owner = p.business.users[0] ?? null;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        discount: p.discount,
        validUntil: p.validUntil.toISOString(),
        business: {
          id: p.business.id,
          name: p.business.name,
          category: p.business.category,
          city: p.business.city,
        },
        owner: owner
          ? {
              name: owner.name,
              slug: owner.slug,
              avatarUrl: owner.avatarUrl,
              serviceType: owner.serviceType,
            }
          : null,
      };
    });

    return NextResponse.json({ promotions: result });
  } catch (error) {
    console.error("[public promotions GET]", error);
    return NextResponse.json({ promotions: [] });
  }
}
