import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { broadcastToBusinessClients } from "@/lib/notifications";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  promotionId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: user } = await supabase
      .from('User')
      .select('appRole, businessId, business:Business(slug)')
      .eq('id', session.userId)
      .single();

    if (user?.appRole !== "owner" || !user.businessId) {
      return NextResponse.json({ error: "Solo el propietario puede enviar promos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { data: promotion, error: promoError } = await admin
      .from('Promotion')
      .select('*')
      .eq('id', parsed.data.promotionId)
      .single();

    if (promoError || !promotion) {
      console.error("[promotions broadcast] Promotion not found:", parsed.data.promotionId, promoError);
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    if (promotion.businessId !== user.businessId) {
      console.error("[promotions broadcast] Promotion businessId mismatch:", promotion.businessId, user.businessId);
      return NextResponse.json({ error: "Promoción no pertenece al negocio" }, { status: 403 });
    }

    const slug = (user as any).business?.slug;

    await broadcastToBusinessClients(user.businessId, {
      title: `✨ ${promotion.title}`,
      body: promotion.description,
      url: `/p/${slug}`,
      tag: `promo-${promotion.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[promotions broadcast POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
