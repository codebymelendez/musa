import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: promotions, error: pError } = await supabase
      .from('Promotion')
      .select(`
        *,
        business:Business(
          id,
          name,
          category,
          city,
          users:User(
            name,
            slug,
            avatarUrl,
            serviceType,
            role
          )
        )
      `);

    if (pError) {
      console.error("[public promotions] Error:", pError);
      return NextResponse.json({ promotions: [] });
    }

    console.log(`[public promotions] Total en DB: ${promotions?.length || 0}`);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filteredPromotions = (promotions || []).filter(p => {
      // Si no tiene fechas, la mostramos (fallback) o si isActive es true
      if (!p.isActive) return false;
      if (!p.validFrom || !p.validUntil) return p.isActive;

      const from = new Date(p.validFrom);
      const until = new Date(p.validUntil);
      const isMatch = from <= now && until >= startOfToday;
      if (!isMatch) console.log(`[public promotions] Excluida por fecha: ${p.id} (desde ${p.validFrom} hasta ${p.validUntil})`);
      return isMatch;
    })
    .sort((a, b) => (b.discount || 0) - (a.discount || 0))
    .slice(0, 12);

    console.log(`[public promotions] Retornando: ${filteredPromotions.length}`);
    
    if (filteredPromotions.length === 0) {
      return NextResponse.json({ promotions: [] });
    }

    const result = filteredPromotions.map((p: any) => {
      const owner = p.business.users.find((u: any) => u.role === 'OWNER') ?? null;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        discount: p.discount,
        validUntil: p.validUntil,
        business: {
          id: p.business.id,
          name: p.business.name,
          category: p.business.category,
          city: p.business.city,
        },
        owner: owner
          ? {
              name: owner.name,
              slug: owner.slug,
              avatarUrl: owner.avatarUrl,
              serviceType: owner.serviceType,
            }
          : null,
      };
    });

    return NextResponse.json({ promotions: result });
  } catch (error) {
    console.error("[public promotions GET]", error);
    return NextResponse.json({ promotions: [] });
  }
}
