import { createAdminClient } from "@/lib/supabase-admin";

// ── Free-plan defaults (used when Plan.limits is missing fields) ──────────────
export const FREE_PLAN_LIMITS = {
  maxMonthlyAppointments: 25,
  maxActiveClients: 10,
};

// Bounds for the current calendar month
function currentMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function getPlanConfig(businessId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("Business")
    .select("planStatus, planExpiresAt, plan:Plan(name, limits)")
    .eq("id", businessId)
    .single();

  const rawStatus = data?.planStatus ?? "free";
  const planExpiresAt = data?.planExpiresAt;

  // Check if active plan has expired
  let isVibrantActive = rawStatus === "active";
  if (isVibrantActive && planExpiresAt) {
    const expires = new Date(planExpiresAt);
    if (expires < new Date()) {
      isVibrantActive = false;
    }
  }

  const plan = Array.isArray(data?.plan) ? data?.plan[0] : data?.plan;

  // If active, use plan limits. Otherwise, fall back to FREE limits
  const limits = (isVibrantActive ? (plan?.limits ?? {}) : {}) as Record<string, number>;
  const planName = isVibrantActive ? (plan?.name ?? "FREE") : "FREE";

  return {
    planName: planName as string,
    maxMonthlyAppointments:
      limits.appointments ?? limits.maxMonthlyAppointments ?? FREE_PLAN_LIMITS.maxMonthlyAppointments,
    maxActiveClients:
      limits.activeClients ?? limits.maxActiveClients ?? FREE_PLAN_LIMITS.maxActiveClients,
  };
}

// ── Public: used by dashboard widget and limit checks ────────────────────────
export async function getLimitStatus(businessId: string) {
  const admin = createAdminClient();
  const { start, end } = currentMonthBounds();

  const { data: users } = await admin
    .from("User")
    .select("id")
    .eq("businessId", businessId);

  const userIds = (users ?? []).map((u: { id: string }) => u.id);

  const [planConfig, aptResult, clientResult] = await Promise.all([
    getPlanConfig(businessId),

    // Count appointments scheduled this month (cancelled/no_show not counted —
    // professionals shouldn't be penalised for slots outside their control)
    userIds.length > 0
      ? admin
          .from("Appointment")
          .select("id", { count: "exact", head: true })
          .in("userId", userIds)
          .not("status", "in", "(cancelled,no_show)")
          .gte("startTime", start)
          .lte("startTime", end)
      : Promise.resolve({ count: 0 as number | null }),

    // Count active client profiles for this business
    admin
      .from("Client")
      .select("id", { count: "exact", head: true })
      .eq("businessId", businessId)
      .eq("isActive", true),
  ]);

  return {
    planName: planConfig.planName,
    appointments: {
      used: aptResult.count ?? 0,
      limit: planConfig.maxMonthlyAppointments,
    },
    clients: {
      used: clientResult.count ?? 0,
      limit: planConfig.maxActiveClients,
    },
  };
}

// ── Enforcement helpers ───────────────────────────────────────────────────────

export async function checkAppointmentLimit(businessId: string): Promise<boolean> {
  const status = await getLimitStatus(businessId);
  return status.appointments.used < status.appointments.limit;
}

export async function checkClientLimit(businessId: string): Promise<boolean> {
  const status = await getLimitStatus(businessId);
  return status.clients.used < status.clients.limit;
}

