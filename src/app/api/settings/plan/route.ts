import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { planName, professionalsCount, paymentMethod, referenceNumber, amountUSD, amountBS, bcvRate } = body;

    if (!planName) {
      return NextResponse.json({ error: "Nombre de plan requerido" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Buscar el plan en la base de datos
    const { data: plan } = await admin
      .from('Plan')
      .select('id, name')
      .eq('name', planName)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // 2. Obtener el usuario, su negocio y el estado actual de su plan
    const { data: user } = await admin
      .from('User')
      .select('id, businessId, business:Business(planStatus)')
      .eq('id', session.userId)
      .single();

    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const rawBusiness = Array.isArray(user.business) ? user.business[0] : user.business;
    const currentPlanStatus = rawBusiness?.planStatus;

    if (planName === "FREE") {
      // Downgrade inmediato a FREE
      const { error: updateError } = await admin
        .from('Business')
        .update({
          planId: plan.id,
          planStatus: 'free',
          planExpiresAt: null
        })
        .eq('id', user.businessId);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, plan: 'FREE', status: 'free' });
    } else {
      // Planes de pago: validar método, referencia y estados pendientes
      if (!paymentMethod || !["pagomovil", "zelle"].includes(paymentMethod)) {
        return NextResponse.json({ error: "Método de pago inválido o requerido" }, { status: 400 });
      }

      if (!referenceNumber || referenceNumber.trim().length === 0) {
        const errorMsg = paymentMethod === "pagomovil" 
          ? "Número de referencia requerido" 
          : "Remitente o titular de la cuenta requerido";
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      if (currentPlanStatus === 'under_review') {
        return NextResponse.json({ error: "Ya tienes un pago pendiente en revisión. Por favor espera a que sea verificado." }, { status: 400 });
      }

      // Por seguridad extra, verificar si existe algún registro 'under_review' en SubscriptionPayment
      const { data: existingPayment } = await admin
        .from('SubscriptionPayment')
        .select('id')
        .eq('businessId', user.businessId)
        .eq('status', 'under_review')
        .maybeSingle();

      if (existingPayment) {
        return NextResponse.json({ error: "Ya tienes una solicitud de pago bajo revisión." }, { status: 400 });
      }

      const paymentId = crypto.randomUUID();
      const { error: paymentError } = await admin
        .from('SubscriptionPayment')
        .insert({
          id: paymentId,
          businessId: user.businessId,
          userId: session.userId,
          planId: plan.id,
          status: 'under_review',
          paymentMethod,
          referenceNumber: referenceNumber.trim(),
          amountUSD: Number(amountUSD || 0),
          amountBS: amountBS ? Number(amountBS) : null,
          bcvRate: bcvRate ? Number(bcvRate) : null,
        });

      if (paymentError) {
        console.error("Error inserting SubscriptionPayment:", paymentError);
        throw paymentError;
      }

      const { error: bizUpdateError } = await admin
        .from('Business')
        .update({
          planStatus: 'under_review'
        })
        .eq('id', user.businessId);

      if (bizUpdateError) throw bizUpdateError;

      return NextResponse.json({ success: true, plan: plan.name, status: 'under_review' });
    }
  } catch (error) {
    console.error("[settings/plan POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
