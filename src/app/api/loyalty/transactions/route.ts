/**
 * POST /api/loyalty/transactions
 * Suma o ajusta puntos manualmente para una clienta.
 * Solo staff del negocio puede usar este endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  accountId: z.string().uuid(),
  pointsDelta: z.number().int().min(-9999).max(9999),
  notes: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { accountId, pointsDelta, notes } = parsed.data;
    const supabase = createAdminClient();

    // Verificar que la cuenta pertenece al negocio del usuario
    const { data: user } = await supabase
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .single();

    if (!user?.businessId) return NextResponse.json({ error: "Sin negocio" }, { status: 400 });

    const { data: account } = await supabase
      .from("ClientLoyaltyAccount")
      .select("id, clientId, businessId, totalPoints, lifetimePoints")
      .eq("id", accountId)
      .eq("businessId", user.businessId)
      .single();

    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    // Verificar que no deje saldo negativo en ajustes manuales
    const newTotal = account.totalPoints + pointsDelta;
    if (newTotal < 0) {
      return NextResponse.json({ error: "Los puntos no pueden quedar negativos" }, { status: 400 });
    }

    const transactionType = pointsDelta >= 0 ? "adjustment" : "redeem";

    const { data: tx, error: txError } = await supabase
      .from("LoyaltyTransaction")
      .insert({
        id: crypto.randomUUID(),
        accountId,
        businessId: account.businessId,
        clientId: account.clientId,
        pointsDelta,
        transactionType,
        notes: notes ?? null,
        createdBy: session.userId,
      })
      .select("*")
      .single();

    if (txError) {
      console.error("[loyalty/transactions POST]", txError);
      return NextResponse.json({ error: "Error al registrar transacción" }, { status: 500 });
    }

    // Actualizar saldo
    const newLifetime = pointsDelta > 0
      ? account.lifetimePoints + pointsDelta
      : account.lifetimePoints;

    await supabase
      .from("ClientLoyaltyAccount")
      .update({
        totalPoints: newTotal,
        lifetimePoints: newLifetime,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", accountId);

    return NextResponse.json({ transaction: tx, newTotalPoints: newTotal }, { status: 201 });
  } catch (err) {
    console.error("[loyalty/transactions POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
