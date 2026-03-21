// GET    /api/appointments/[id]
// PATCH  /api/appointments/[id]  – actualizar estado, notas, pago
// DELETE /api/appointments/[id]
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "completed", "no_show", "cancelled"])
    .optional(),
  notes: z.string().optional(),
  payment: z
    .object({
      amount: z.number(),
      method: z.enum([
        "efectivo_bs",
        "efectivo_usd",
        "pago_movil",
        "zelle",
        "otro",
      ]),
      isPaid: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, userId: session.userId },
    include: { client: true, service: true, payment: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, userId: session.userId },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { status, notes, payment } = parsed.data;

    // Actualizar cita
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Registrar/actualizar pago si se envía
    if (payment) {
      const { amount, method, isPaid = true, notes: payNotes } = payment;

      await prisma.payment.upsert({
        where: { appointmentId: id },
        update: {
          amount,
          method,
          isPaid,
          notes: payNotes,
          paidAt: isPaid ? new Date() : null,
        },
        create: {
          appointmentId: id,
          amount,
          currency: "USD",
          method,
          isPaid,
          notes: payNotes,
          paidAt: isPaid ? new Date() : null,
        },
      });
    }

    const result = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true, service: true, payment: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[appointments PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, userId: session.userId },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  // Soft delete: cambiar estado a "cancelled"
  await prisma.appointment.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
