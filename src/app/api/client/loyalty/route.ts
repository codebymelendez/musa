/**
 * GET /api/client/loyalty
 * Retorna las cuentas de fidelización de la clienta autenticada,
 * más los negocios donde podría inscribirse (tiene citas pero sin cuenta).
 * Autenticación: JWT de clienta (header Authorization: Bearer <token>)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientSession } from "@/lib/clientAuth";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const authHeader = req.headers.get("authorization");

  let clientQuery: { column: "phone" | "email"; value: string } | null = null;

  if (authHeader) {
    const clientSession = await getClientSession(authHeader);
    if (!clientSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    clientQuery = { column: "phone", value: clientSession.clientPhone };
  } else {
    const supabaseSession = await getSession(req);
    if (!supabaseSession?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    clientQuery = { column: "email", value: supabaseSession.email };
  }

  try {
    // Buscar el/los Client registros por teléfono o email
    const { data: clients } = await supabase
      .from("Client")
      .select("id, businessId")
      .eq(clientQuery.column, clientQuery.value);

    if (!clients || clients.length === 0) {
      return NextResponse.json({ accounts: [], eligible: [] });
    }

    const clientIds = clients.map((c) => c.id);
    const businessIds = [...new Set(clients.map((c) => c.businessId).filter(Boolean))];

    // Buscar cuentas de fidelización existentes
    const { data: accounts } = await supabase
      .from("ClientLoyaltyAccount")
      .select(`
        id, clientId, businessId, programId, totalPoints, lifetimePoints, qrToken, updatedAt,
        program:LoyaltyProgram(id, name, rewardThreshold, rewardDescription, isActive, accumulationType),
        business:Business(id, name, logoUrl)
      `)
      .in("clientId", clientIds);

    // Para cuentas donde programId está null (datos legados), hacer lookup por businessId
    const normalizedAccounts = await Promise.all(
      (accounts ?? []).map(async (a) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let program: any = Array.isArray(a.program) ? a.program[0] : a.program;
        if (!program && a.businessId) {
          const { data: fallbackProgram } = await supabase
            .from("LoyaltyProgram")
            .select("id, name, rewardThreshold, rewardDescription, isActive, accumulationType")
            .eq("businessId", a.businessId)
            .maybeSingle();
          program = fallbackProgram ?? null;
        }
        return {
          ...a,
          program,
          business: Array.isArray(a.business) ? a.business[0] : a.business,
        };
      })
    );
    const normalized = normalizedAccounts;

    // IDs de negocios donde ya tiene cuenta
    const enrolledBusinessIds = new Set(
      normalized.map((a) => {
        const biz = a.business as { id: string } | null;
        return biz?.id;
      }).filter(Boolean)
    );

    // Buscar negocios donde tiene citas pero aún no está inscrita
    let eligible: { businessId: string; businessName: string }[] = [];
    if (businessIds.length > 0) {
      const unenrolledBizIds = businessIds.filter((id) => id && !enrolledBusinessIds.has(id));
      if (unenrolledBizIds.length > 0) {
        const { data: activePrograms } = await supabase
          .from("LoyaltyProgram")
          .select("businessId, name, Business(name)")
          .in("businessId", unenrolledBizIds)
          .eq("isActive", true);

        eligible = (activePrograms ?? []).map((p) => {
          const biz = Array.isArray(p.Business) ? p.Business[0] : p.Business;
          return {
            businessId: p.businessId,
            businessName: (biz as { name: string } | null)?.name ?? "Negocio",
          };
        });
      }
    }

    return NextResponse.json({ accounts: normalized, eligible });
  } catch (error) {
    console.error("[client/loyalty GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
