// GET /api/slug/check?slug=...
// Comprueba disponibilidad de un slug para el usuario autenticado.
// Respuesta: { available, normalized, reason? }. Este check es cortesía para la UI;
// el PATCH /api/business/slug revalida todo server-side antes de escribir.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeSlug, validateSlug, checkSlugAvailability } from "@/lib/slug";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const normalized = normalizeSlug(raw);

  const validation = validateSlug(normalized);
  if (!validation.ok) {
    return NextResponse.json({ available: false, normalized, reason: validation.message });
  }

  try {
    const admin = createAdminClient();

    // El slug es del Business: resolver el negocio del usuario server-side
    const { data: user } = await admin
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .maybeSingle();
    if (!user?.businessId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const availability = await checkSlugAvailability(admin, normalized, user.businessId);

    if (!availability.available) {
      return NextResponse.json({ available: false, normalized, reason: availability.message });
    }
    return NextResponse.json({ available: true, normalized });
  } catch (error) {
    console.error("[slug check GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
