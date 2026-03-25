import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token faltante" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: invitation, error } = await supabase
      .from('Invitation')
      .select('*, business:Business(name)')
      .eq('token', token)
      .is('usedAt', null)
      .single();

    if (error || !invitation || (invitation.expiresAt && new Date(invitation.expiresAt) < new Date())) {
      return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 404 });
    }

    return NextResponse.json({ business: invitation.business });
  } catch (error) {
    console.error("[team invite validate GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
