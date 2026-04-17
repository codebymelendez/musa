/**
 * GET /api/loyalty/scan/[token]
 * Busca una cuenta de fidelización por QR token.
 * Usado por el staff cuando escanea o introduce el código manualmente.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { token } = await params;
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("User")
    .select("businessId")
    .eq("id", session.userId)
    .single();

  if (!user?.businessId) return NextResponse.json({ error: "Sin negocio" }, { status: 400 });

  const { data: account } = await supabase
    .from("ClientLoyaltyAccount")
    .select(`
      id, clientId, totalPoints, lifetimePoints, qrToken, createdAt,
      client:Client(id, name, phone),
      program:LoyaltyProgram(id, name, rewardThreshold, pointsPerVisit, rewardDescription, isActive)
    `)
    .eq("qrToken", token)
    .eq("businessId", user.businessId)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "Código QR no encontrado" }, { status: 404 });

  return NextResponse.json({
    account: {
      ...account,
      client: Array.isArray(account.client) ? account.client[0] : account.client,
      program: Array.isArray(account.program) ? account.program[0] : account.program,
    },
  });
}
