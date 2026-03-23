// POST /api/push/subscribe-client
// Guarda suscripción push para una clienta (sin autenticación de staff).
// Se llama después del booking con el clientId devuelto por /api/public/[slug]/book.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  clientId: z.string().cuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { clientId, subscription } = parsed.data;

    // Verificar que la clienta existe
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        clientId,
        keys: JSON.stringify(subscription.keys),
      },
      create: {
        clientId,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
      },
    });

    // Marcar que la clienta quiere notificaciones
    await prisma.client.update({
      where: { id: clientId },
      data: { wantsNotifications: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push subscribe-client POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
