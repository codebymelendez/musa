import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { redeemLoyaltyReward } from "@/lib/loyalty";

const schema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { accountId } = parsed.data;
    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .single();

    if (!user?.businessId) return NextResponse.json({ error: "Sin negocio" }, { status: 400 });

    // Obtener la cuenta + programa para saber cuántos puntos se necesitan
    const { data: account } = await supabase
      .from("ClientLoyaltyAccount")
      .select("id, clientId, businessId, totalPoints, program:LoyaltyProgram(rewardThreshold, rewardDescription, isActive)")
      .eq("id", accountId)
      .eq("businessId", user.businessId)
      .single();

    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const program = Array.isArray(account.program) ? account.program[0] : account.program;
    if (!program?.isActive) {
      return NextResponse.json({ error: "El programa de fidelización no está activo" }, { status: 400 });
    }

    if (account.totalPoints < program.rewardThreshold) {
      return NextResponse.json(
        { error: `Se necesitan ${program.rewardThreshold} puntos. La clienta tiene ${account.totalPoints}` },
        { status: 400 }
      );
    }

    const result = await redeemLoyaltyReward({
      accountId,
      businessId: account.businessId,
      clientId: account.clientId,
      redeemedBy: session.userId,
      rewardDescription: program.rewardDescription,
      pointsToRedeem: program.rewardThreshold,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      redemptionId: result.redemptionId,
      pointsUsed: program.rewardThreshold,
    });
  } catch (err) {
    console.error("[loyalty/redeem POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
