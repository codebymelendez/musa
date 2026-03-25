import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  try {
    const supabase = await createClient();
    
    const { data: user } = await supabase
      .from('User')
      .select('businessId')
      .eq('slug', slug)
      .single();

    if (!user?.businessId) {
      return NextResponse.json({ promotions: [] });
    }

    const now = new Date().toISOString();
    const { data: promotions } = await supabase
      .from('Promotion')
      .select('*')
      .eq('businessId', user.businessId)
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
