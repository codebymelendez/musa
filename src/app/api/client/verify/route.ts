// POST /api/client/verify
// Verifica identidad de clienta por teléfono + nombre.
// No requiere contraseña. Devuelve JWT para el portal de clientas.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signClientToken } from "@/lib/clientAuth";

const schema = z.object({
  phone: z.string().min(7),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { phone, name } = parsed.data;

    // Buscar clienta por teléfono en cualquier negocio
    const client = await prisma.client.findFirst({
      where: { phone },
      select: { id: true, name: true, phone: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "No encontramos citas con ese número. ¿Ya hiciste una reserva?" },
        { status: 404 }
      );
    }

    // Verificar que el nombre coincide (insensible a mayúsculas y tildes)
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const nameMatch =
      normalize(client.name).includes(normalize(name)) ||
      normalize(name).includes(normalize(client.name));

    if (!nameMatch) {
      return NextResponse.json(
        { error: "El nombre no coincide con nuestros registros" },
        { status: 401 }
      );
    }

    // Contar reservas para confirmar que es usuaria real
    const appointmentsCount = await prisma.appointment.count({
      where: { client: { phone } },
    });

    const token = await signClientToken({ clientPhone: phone, clientName: client.name });

    return NextResponse.json({
      token,
      clientName: client.name,
      appointmentsCount,
    });
  } catch (error) {
    console.error("[client verify POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
