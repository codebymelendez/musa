import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("User")
    .select("businessId")
    .eq("id", session.userId)
    .single();

  if (!user?.businessId) return NextResponse.json({ error: "Sin negocio" }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim();

  let query = supabase
    .from("ClientLoyaltyAccount")
    .select(`
      id, clientId, totalPoints, lifetimePoints, qrToken, createdAt, updatedAt,
      client:Client(id, name, phone),
      program:LoyaltyProgram(id, name, rewardThreshold, pointsPerVisit, accumulationType)
    `)
    .eq("businessId", user.businessId)
    .order("totalPoints", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("[loyalty/accounts GET]", error);
    return NextResponse.json({ error: "Error al cargar cuentas" }, { status: 500 });
  }

  // Normalizar relaciones one-to-one
  let accounts = (data ?? []).map((a) => ({
    ...a,
    client: Array.isArray(a.client) ? a.client[0] : a.client,
    program: Array.isArray(a.program) ? a.program[0] : a.program,
  }));

  // Filtro de búsqueda en JS (Supabase no soporta ilike en join)
  if (search) {
    const lower = search.toLowerCase();
    accounts = accounts.filter(
      (a) =>
        a.client?.name?.toLowerCase().includes(lower) ||
        a.client?.phone?.includes(search)
    );
  }

  return NextResponse.json({ accounts });
}
