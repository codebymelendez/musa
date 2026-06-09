import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const admin = createAdminClient();

    // 1. Verificar si el usuario es administrador en la base de datos
    const { data: user } = await admin
      .from('User')
      .select('isAdmin')
      .eq('id', session.userId)
      .single();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    // 2. Obtener lista de pagos registrados ordenados por fecha
    const { data: payments, error } = await admin
      .from('SubscriptionPayment')
      .select('*, business:Business(name, slug), user:User!SubscriptionPayment_userId_fkey(name, email), plan:Plan(name)')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error("Error fetching SubscriptionPayments:", error);
      return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
    }

    const formattedPayments = (payments || []).map((pay: any) => ({
      ...pay,
      business: Array.isArray(pay.business) ? pay.business[0] : pay.business,
      user: Array.isArray(pay.user) ? pay.user[0] : pay.user,
      plan: Array.isArray(pay.plan) ? pay.plan[0] : pay.plan,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("[admin/plan-payments GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
