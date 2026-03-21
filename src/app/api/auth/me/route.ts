import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { settings: true, business: { include: { plan: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      slug: user.slug,
      serviceType: user.serviceType,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      whatsapp: user.whatsapp,
      instagram: user.instagram,
      onboardingDone: user.onboardingDone,
      settings: user.settings
        ? { ...user.settings, workDays: JSON.parse(user.settings.workDays) }
        : null,
      role: user.role,
      businessId: user.businessId,
      business: user.business,
    });
  } catch (error) {
    console.error("[me]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
