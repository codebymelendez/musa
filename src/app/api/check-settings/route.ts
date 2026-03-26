import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  
  if (!userId) return NextResponse.json({ error: "Missing userId" });

  const supabase = createAdminClient();
  const { data: settings, error } = await supabase
    .from('ProfessionalSettings')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  return NextResponse.json({ userId, settings, error });
}
