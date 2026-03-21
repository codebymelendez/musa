// GET  /api/services
// POST /api/services

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  category: z.enum(["nails", "hair", "brows", "makeup", "other"]),
  durationMin: z.number().int().positive("La duración debe ser mayor a 0"),
  price: z.number().nonnegative("El precio no puede ser negativo"),
  currency: z.string().default("USD"),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const services = await prisma.service.findMany({
      where: { userId: session.userId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("[services GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: { ...parsed.data, userId: session.userId },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("[services POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
