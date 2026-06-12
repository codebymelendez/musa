import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { bestActivePromotion } from "@/lib/promotions";

/**
 * GET /api/promotions/active?at=<ISO>
 * Devuelve la mejor promoción activa (mayor descuento) del negocio del staff
 * autenticado en el instante `at` (default: ahora). Se usa para sugerir el
 * precio con descuento al registrar el cobro de una cita.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const atParam = req.nextUrl.searchParams.get("at");
    let at = atParam ? new Date(atParam) : new Date();
    if (isNaN(at.getTime())) at = new Date();

    const admin = createAdminClient();
    const { data: user } = await admin
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .single();

    if (!user?.businessId) {
      return NextResponse.json({ promotion: null });
    }

    const { data: promotions, error } = await admin
      .from("Promotion")
      .select("id, title, discount, validFrom, validUntil, isActive")
      .eq("businessId", user.businessId)
      .eq("isActive", true);

    if (error) {
      console.error("[promotions active GET]", error);
      return NextResponse.json({ promotion: null });
    }

    const best = bestActivePromotion(promotions ?? [], at);
    return NextResponse.json({
      promotion: best ? { id: best.id, title: best.title, discount: best.discount } : null,
    });
  } catch (error) {
    console.error("[promotions active GET]", error);
    return NextResponse.json({ promotion: null });
  }
}
