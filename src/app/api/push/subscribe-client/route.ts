import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const schema = z.object({
  clientId: z.string(),
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
    const supabase = await createClient();

    // Verificar que la clienta existe
    const { data: client } = await supabase
      .from('Client')
      .select('id')
      .eq('id', clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });
    }

    const { error: upsertError } = await supabase
      .from('PushSubscription')
      .upsert({
        clientId,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
      }, { onConflict: 'endpoint' });

    if (upsertError) {
       console.error("[push subscribe-client upsert error]", upsertError);
    }

    // Marcar que la clienta quiere notificaciones
    await supabase.from('Client').update({ wantsNotifications: true }).eq('id', clientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push subscribe-client POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
