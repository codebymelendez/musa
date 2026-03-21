import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, sessionCookieOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const registerSchema = z.object({
  phone: z.string().min(7, "Teléfono inválido"),
  name: z.string().min(2, "Nombre muy corto"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  token: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { phone, name, password, token: joinToken } = parsed.data;

    // 1. Validar invitación si hay token
    let businessId: string | null = null;
    let role = "OWNER";

    if (joinToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: joinToken, usedAt: null },
      });

      if (!invitation || (invitation.expiresAt && invitation.expiresAt < new Date())) {
        return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 400 });
      }
      
      businessId = invitation.businessId;
      role = "STAFF";
    }

    // 2. Verificar si el teléfono ya existe
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: "Este número ya está registrado" },
        { status: 409 }
      );
    }

    // 3. Generar slug único
    let slug = slugify(name);
    const slugExists = await prisma.user.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Crear usuario + settings por defecto
    const user = await prisma.user.create({
      data: {
        phone,
        name,
        slug,
        passwordHash,
        role,
        businessId,
        settings: {
          create: {
            workDays: JSON.stringify([1, 2, 3, 4, 5]),
            startHour: 9,
            endHour: 18,
            slotDuration: 30,
            currency: "USD",
            bookingEnabled: true,
          },
        },
      },
    });

    // 5. Marcar invitación como usada
    if (joinToken) {
      await prisma.invitation.update({
        where: { token: joinToken },
        data: { usedAt: new Date() },
      });
    }

    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      slug: user.slug,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          slug: user.slug,
          role: user.role,
          businessId: user.businessId,
          onboardingDone: user.onboardingDone,
        },
      },
      { status: 201 }
    );

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

