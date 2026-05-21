import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { planName, professionalsCount, paymentMethod, referenceNumber, amountUSD, amountBS, bcvRate } = body;

    if (!planName) {
      return NextResponse.json({ error: "Nombre de plan requerido" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Buscar el plan en la base de datos
    const { data: plan } = await supabase
      .from('Plan')
      .select('id, name')
      .eq('name', planName)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // 2. Obtener el usuario y su negocio
    const { data: user } = await supabase
      .from('User')
      .select('id, businessId, business:Business(*)')
      .eq('id', session.userId)
      .single();

    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // 3. Actualizar el plan del negocio
    const { error: updateError } = await supabase
      .from('Business')
      .update({ planId: plan.id })
      .eq('id', user.businessId);

    if (updateError) throw updateError;

    // Log de verificación manual del pago (el equipo MUSA revisa los logs)
    if (referenceNumber) {
      console.info("[plan-payment-verification]", {
        businessId:  user.businessId,
        userId:      session.userId,
        planName,
        professionalsCount: professionalsCount ?? 1,
        paymentMethod,
        referenceNumber,
        amountUSD,
        amountBS,
        bcvRate,
        ts: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, plan: plan.name });
  } catch (error) {
    console.error("[settings/plan POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
