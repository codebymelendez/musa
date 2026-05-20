import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getLimitStatus } from "@/lib/limits";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: user } = await admin
    .from("User")
    .select("businessId")
    .eq("id", session.userId)
    .single();

  if (!user?.businessId) {
    return NextResponse.json({ error: "Sin negocio asociado" }, { status: 400 });
  }

  const status = await getLimitStatus(user.businessId);
  return NextResponse.json(status);
}
