/**
 * loyalty.ts
 * Helpers del sistema de fidelización.
 * Todas las funciones usan el admin client (server-only).
 */

import { createAdminClient } from "@/lib/supabase-admin";

/**
 * Intenta dar puntos a una clienta por una cita completada.
 * - Idempotente: si la cita ya fue procesada (UNIQUE en appointmentId) no suma de nuevo.
 * - Auto-enrola a la clienta si no tiene cuenta.
 * - No hace nada si el programa está desactivado o no existe.
 *
 * Retorna `true` si se sumaron puntos, `false` si ya existían o programa inactivo.
 */
export async function awardLoyaltyPoints(options: {
  businessId: string;
  clientId: string;
  appointmentId: string;
  createdBy: string;
}): Promise<boolean> {
  const { businessId, clientId, appointmentId, createdBy } = options;
  const supabase = createAdminClient();

  // 1. Verificar que el programa existe y está activo
  const { data: program } = await supabase
    .from("LoyaltyProgram")
    .select("id, isActive, pointsPerVisit")
    .eq("businessId", businessId)
    .maybeSingle();

  if (!program || !program.isActive) return false;

  // 2. Obtener o crear la cuenta de la clienta
  let { data: account } = await supabase
    .from("ClientLoyaltyAccount")
    .select("id, totalPoints, lifetimePoints")
    .eq("businessId", businessId)
    .eq("clientId", clientId)
    .maybeSingle();

  if (!account) {
    const { data: newAccount, error: createErr } = await supabase
      .from("ClientLoyaltyAccount")
      .insert({
        id: crypto.randomUUID(),
        businessId,
        clientId,
        programId: program.id,
        totalPoints: 0,
        lifetimePoints: 0,
      })
      .select("id, totalPoints, lifetimePoints")
      .single();

    if (createErr || !newAccount) {
      console.error("[loyalty] Error creando cuenta:", createErr);
      return false;
    }
    account = newAccount;
  }

  const delta = program.pointsPerVisit;

  // 3. Insertar transacción — la constraint UNIQUE(appointmentId) previene duplicados
  const { error: txError } = await supabase
    .from("LoyaltyTransaction")
    .insert({
      id: crypto.randomUUID(),
      accountId: account.id,
      businessId,
      clientId,
      appointmentId,
      pointsDelta: delta,
      transactionType: "earn",
      createdBy,
    });

  if (txError) {
    // Error 23505 = violación de UNIQUE constraint → ya fue procesado
    if (txError.code === "23505") return false;
    console.error("[loyalty] Error insertando transacción:", txError);
    return false;
  }

  // 4. Actualizar totales en la cuenta
  await supabase
    .from("ClientLoyaltyAccount")
    .update({
      totalPoints: account.totalPoints + delta,
      lifetimePoints: account.lifetimePoints + delta,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", account.id);

  return true;
}

/**
 * Canjea la recompensa para una clienta.
 * - Verifica que tiene suficientes puntos.
 * - Descuenta los puntos y registra el canje.
 */
export async function redeemLoyaltyReward(options: {
  accountId: string;
  businessId: string;
  clientId: string;
  redeemedBy: string;
  rewardDescription: string;
  pointsToRedeem: number;
}): Promise<{ ok: true; redemptionId: string } | { ok: false; error: string }> {
  const { accountId, businessId, clientId, redeemedBy, rewardDescription, pointsToRedeem } = options;
  const supabase = createAdminClient();

  // 1. Verificar saldo suficiente
  const { data: account } = await supabase
    .from("ClientLoyaltyAccount")
    .select("id, totalPoints")
    .eq("id", accountId)
    .single();

  if (!account) return { ok: false, error: "Cuenta no encontrada" };
  if (account.totalPoints < pointsToRedeem) {
    return { ok: false, error: "Puntos insuficientes" };
  }

  // 2. Insertar transacción negativa
  const txId = crypto.randomUUID();
  const { error: txError } = await supabase
    .from("LoyaltyTransaction")
    .insert({
      id: txId,
      accountId,
      businessId,
      clientId,
      pointsDelta: -pointsToRedeem,
      transactionType: "redeem",
      notes: rewardDescription,
      createdBy: redeemedBy,
    });

  if (txError) {
    console.error("[loyalty] Error insertando transacción de canje:", txError);
    return { ok: false, error: "Error al registrar el canje" };
  }

  // 3. Registrar en tabla de canjes
  const redemptionId = crypto.randomUUID();
  await supabase.from("LoyaltyRedemption").insert({
    id: redemptionId,
    accountId,
    transactionId: txId,
    businessId,
    clientId,
    pointsUsed: pointsToRedeem,
    rewardDescription,
    redeemedBy,
  });

  // 4. Descontar puntos de la cuenta
  await supabase
    .from("ClientLoyaltyAccount")
    .update({
      totalPoints: account.totalPoints - pointsToRedeem,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", accountId);

  return { ok: true, redemptionId };
}
