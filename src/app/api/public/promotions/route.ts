import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: promotions } = await supabase
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
      `)
      .eq('isActive', true)
      .lte('validFrom', now)
      .gte('validUntil', now)
      .order('discount', { ascending: false })
      .limit(12);

    if (!promotions) {
      return NextResponse.json({ promotions: [] });
    }

    const result = promotions.map((p: any) => {
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
