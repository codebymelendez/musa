import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { planName, professionalsCount } = await req.json();

    if (!planName) {
      return NextResponse.json({ error: "Nombre de plan requerido" }, { status: 400 });
    }

    // 1. Buscar el plan en la base de datos
    const plan = await prisma.plan.findUnique({
      where: { name: planName }
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // 2. Obtener el usuario y su negocio
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { business: true }
    });

    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // 3. Actualizar el plan del negocio
    // Nota: Aquí se activaría la configuración respectiva
    // Si es TEAM, podríamos guardar el número de profesionales contratados en algún lugar si fuera necesario,
    // pero por ahora actualizamos el planId.
    await prisma.business.update({
      where: { id: user.businessId },
      data: {
        planId: plan.id
      }
    });

    return NextResponse.json({ success: true, plan: plan.name });
  } catch (error) {
    console.error("[settings/plan POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
