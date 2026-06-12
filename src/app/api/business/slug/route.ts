// PATCH /api/business/slug — Body: { slug }
// Cambia el slug público del Business del usuario autenticado (Business.slug
// es el canónico desde la migración 2026-06, PENDING_SQL §8). El slug anterior
// se archiva en SlugHistory para que los enlaces compartidos sigan redirigiendo.
// Cooldown de 30 días entre cambios (el primero es libre).

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeSlug, validateSlug, checkSlugAvailability, escapeIlike } from "@/lib/slug";

const COOLDOWN_DAYS = 30;

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { slug?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  if (typeof body.slug !== "string") {
    return NextResponse.json({ error: "Falta el campo slug" }, { status: 400 });
  }

  const normalized = normalizeSlug(body.slug);
  const validation = validateSlug(normalized);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Resolver el Business del usuario server-side
    const { data: user, error: userErr } = await admin
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .single();
    if (userErr || !user?.businessId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const { data: business, error: bizErr } = await admin
      .from("Business")
      .select("id, slug, slugChangedAt, timezone")
      .eq("id", user.businessId)
      .single();
    if (bizErr || !business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    if (business.slug.toLowerCase() === normalized) {
      return NextResponse.json({ error: "Ese ya es tu enlace actual." }, { status: 400 });
    }

    // Cooldown: 30 días desde el último cambio. El primer cambio (null) es libre.
    if (business.slugChangedAt) {
      const nextAllowed = new Date(
        new Date(business.slugChangedAt).getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      );
      if (nextAllowed.getTime() > Date.now()) {
        const fecha = nextAllowed.toLocaleDateString("es-VE", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: business.timezone || "America/Caracas",
        });
        return NextResponse.json(
          { error: `Solo puedes cambiar tu enlace una vez cada ${COOLDOWN_DAYS} días. Podrás cambiarlo de nuevo el ${fecha}.` },
          { status: 429 }
        );
      }
    }

    // Revalidar disponibilidad SIEMPRE (el check del cliente es cortesía, no autorización)
    const availability = await checkSlugAvailability(admin, normalized, business.id);
    if (!availability.available) {
      return NextResponse.json({ error: availability.message }, { status: 409 });
    }

    // Si reclama un slug de su propio historial, eliminarlo primero
    // (evita un ciclo de redirección historial → slug actual → historial).
    if (availability.reclaimedFromOwnHistory) {
      const { error: delErr } = await admin
        .from("SlugHistory")
        .delete()
        .eq("businessId", business.id)
        .ilike("slug", escapeIlike(normalized));
      if (delErr) throw delErr;
    }

    // Archivar el slug actual ANTES de actualizar: si esto falla, nada cambió;
    // si lo siguiente falla, queda una fila de historial igual al slug vigente,
    // que es inocua (el lookup público consulta Business primero).
    const { data: existingHist, error: existErr } = await admin
      .from("SlugHistory")
      .select("id")
      .eq("businessId", business.id)
      .ilike("slug", escapeIlike(business.slug))
      .limit(1);
    if (existErr) throw existErr;
    if (!existingHist?.length) {
      const { error: histErr } = await admin
        .from("SlugHistory")
        .insert({ businessId: business.id, slug: business.slug });
      if (histErr) throw histErr;
    }

    const { data: updated, error: updErr } = await admin
      .from("Business")
      .update({
        slug: normalized,
        slugChangedAt: new Date().toISOString(),
      })
      .eq("id", business.id)
      .select("id, name, slug, slugChangedAt")
      .single();
    if (updErr || !updated) throw updErr ?? new Error("update failed");

    // La respuesta mantiene la clave `user` por compatibilidad con el móvil
    // (solo lee .slug); contiene el Business actualizado.
    return NextResponse.json({ user: updated, business: updated });
  } catch (error) {
    console.error("[business slug PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
