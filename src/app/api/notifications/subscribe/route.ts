import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    // Guardar o actualizar suscripción
    await prisma.pushSubscription.upsert({
      where: { 
        endpoint: subscription.endpoint 
      },
      update: {
        keys: JSON.stringify(subscription.keys),
      },
      create: {
        userId: session.userId,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push subscribe POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
