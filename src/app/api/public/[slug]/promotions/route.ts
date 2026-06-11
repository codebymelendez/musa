import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { escapeIlike } from "@/lib/slug";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  try {
    const supabase = await createClient();

    // El slug público canónico es Business.slug
    const { data: bizRows } = await supabase
      .from('Business')
      .select('id')
      .ilike('slug', escapeIlike(slug))
      .limit(1);
    const biz = bizRows?.[0];

    if (!biz?.id) {
      return NextResponse.json({ promotions: [] });
    }

    const now = new Date().toISOString();
    const { data: promotions } = await supabase
      .from('Promotion')
      .select('*')
      .eq('businessId', biz.id)
      .eq('isActive', true)
      .lte('validFrom', now)
      .gte('validUntil', now)
      .order('discount', { ascending: false })
      .limit(3);

    return NextResponse.json({ promotions: promotions || [] });
  } catch (error) {
    console.error("[public promotions GET]", error);
    return NextResponse.json({ promotions: [] });
  }
}
