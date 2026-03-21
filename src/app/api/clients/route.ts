// GET  /api/clients?search=texto
// POST /api/clients
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search");

  try {
    const clients = await prisma.client.findMany({
      where: {
        userId: session.userId,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        appointments: {
          orderBy: { startTime: "desc" },
          take: 5,
          include: { service: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("[clients GET]", error);
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

    const { name, phone, email, notes } = parsed.data;

    // Upsert: si ya existe la clienta con ese teléfono, actualizar
    const client = await prisma.client.upsert({
      where: { userId_phone: { userId: session.userId, phone } },
      update: { name, email: email || null, notes },
      create: {
        userId: session.userId,
        name,
        phone,
        email: email || null,
        notes,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[clients POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
