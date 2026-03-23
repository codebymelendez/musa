// GET /api/public/businesses?q=nombre&city=caracas&category=nails
// Devuelve negocios para la página de descubrimiento /explore.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const category = searchParams.get("category")?.trim();

  try {
    const businesses = await prisma.business.findMany({
      where: {
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { users: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }),
        ...(city && { city: { contains: city, mode: "insensitive" } }),
        ...(category && { category }),
        // Solo negocios con al menos un owner onboarded
        users: {
          some: { role: "OWNER", onboardingDone: true },
        },
      },
      include: {
        users: {
          where: { role: "OWNER", onboardingDone: true },
          select: {
            name: true,
            slug: true,
            avatarUrl: true,
            bio: true,
            serviceType: true,
            _count: { select: { services: { where: { isActive: true } } } },
          },
          take: 1,
        },
        _count: {
          select: {
            users: { where: { role: "STAFF" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    });

    const result = businesses
      .filter((b) => b.users.length > 0)
      .map((b) => {
        const owner = b.users[0];
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category,
          city: b.city,
          address: b.address,
          staffCount: b._count.users + 1, // +1 for the owner
          owner: {
            name: owner.name,
            slug: owner.slug,
            avatarUrl: owner.avatarUrl,
            bio: owner.bio,
            serviceType: owner.serviceType,
            servicesCount: owner._count.services,
          },
        };
      });

    return NextResponse.json({ businesses: result });
  } catch (error) {
    console.error("[public businesses GET]", error);
    return NextResponse.json({ businesses: [] });
  }
}
