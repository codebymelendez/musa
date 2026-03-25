import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    const supabase = await createClient();
    // Guardar o actualizar suscripción
    const { error } = await supabase
      .from('PushSubscription')
      .upsert({
        userId: session.userId,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
      }, { onConflict: 'endpoint' });

    if (error) {
       console.error("[push subscribe upsert error]", error);
       return NextResponse.json({ error: "Error al registrar suscripción" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push subscribe POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
