import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, sessionCookieOptions } from "@/lib/auth";

const loginSchema = z.object({
  phone: z.string().min(7),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de inicio de sesión inválidos" },
        { status: 400 }
      );
    }

    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { settings: true, business: { include: { plan: true } } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Número no registrado" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      slug: user.slug,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        slug: user.slug,
        serviceType: user.serviceType,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        whatsapp: user.whatsapp,
        instagram: user.instagram,
        onboardingDone: user.onboardingDone,
        settings: user.settings
          ? {
              ...user.settings,
              workDays: JSON.parse(user.settings.workDays),
            }
          : null,
        role: user.role,
        businessId: user.businessId,
        business: user.business,
      },
    });

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
