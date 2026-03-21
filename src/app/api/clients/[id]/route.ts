// GET   /api/clients/[id]
// PATCH /api/clients/[id]

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId: session.userId },
    include: {
      appointments: {
        orderBy: { startTime: "desc" },
        include: { service: true, payment: true },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId: session.userId },
  });
  if (!client) return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[clients PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
