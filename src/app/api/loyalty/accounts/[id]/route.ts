import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
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
      id, clientId, businessId, totalPoints, lifetimePoints, qrToken, createdAt, updatedAt,
      client:Client(id, name, phone, email),
      program:LoyaltyProgram(id, name, rewardThreshold, pointsPerVisit, accumulationType, rewardDescription, isActive)
    `)
    .eq("id", id)
    .eq("businessId", user.businessId)
    .single();

  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  // Historial de transacciones
  const { data: transactions } = await supabase
    .from("LoyaltyTransaction")
    .select("id, pointsDelta, transactionType, notes, createdAt, appointmentId")
    .eq("accountId", id)
    .order("createdAt", { ascending: false })
    .limit(50);

  // Historial de canjes
  const { data: redemptions } = await supabase
    .from("LoyaltyRedemption")
    .select("id, pointsUsed, rewardDescription, redeemedAt")
    .eq("accountId", id)
    .order("redeemedAt", { ascending: false })
    .limit(20);

  return NextResponse.json({
    account: {
      ...account,
      client: Array.isArray(account.client) ? account.client[0] : account.client,
      program: Array.isArray(account.program) ? account.program[0] : account.program,
    },
    transactions: transactions ?? [],
    redemptions: redemptions ?? [],
  });
}
