// src/lib/slug.ts
// Normalización y validación del slug del perfil público (/p/[slug]).
// El slug canónico vive en User.slug; los slugs anteriores quedan en SlugHistory
// para redirección permanente (ver apps/pro/PENDING_SQL.md §7).
// ⚠️ Las reglas de normalización/validación están duplicadas en apps/pro/lib/utils.ts
// para validación local instantánea en el móvil — mantener ambas en sincronía.

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

// 3–30 chars, solo a-z 0-9 y guiones, sin empezar/terminar en guion
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

// Primeros segmentos de ruta reales de src/app + términos de marca/sistema.
// Aunque el perfil vive bajo /p/, se reservan igual para evitar confusión y
// dejar libres futuras rutas de primer nivel.
export const RESERVED_SLUGS = new Set([
  // Rutas reales en src/app
  "api", "appointments", "auth", "booking", "calendar", "cita", "client",
  "clients", "explore", "forgot-password", "home", "login", "loyalty",
  "notifications", "onboarding", "p", "para-profesionales", "profile",
  "promotions", "reset-password", "services", "settings", "sobre", "staff",
  "stats", "team",
  // Reservados de sistema/marca
  "admin", "app", "www", "b", "s", "logout", "signup", "register",
  "ajustes", "negocio", "business", "perfil", "ayuda", "help", "soporte",
  "support", "legal", "privacidad", "terminos", "getmusa", "musa",
  "pago", "pagos", "planes", "pricing",
]);

/**
 * Normaliza un input libre a formato de slug: minúsculas, sin acentos,
 * espacios → guiones, guiones colapsados, sin guiones extremos.
 * No garantiza validez (puede quedar corto o vacío) — validar después.
 */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SlugValidation =
  | { ok: true }
  | { ok: false; reason: "short" | "long" | "chars" | "reserved"; message: string };

/** Valida un slug YA normalizado. Mensajes en español, específicos por causa. */
export function validateSlug(slug: string): SlugValidation {
  if (slug.length < SLUG_MIN) {
    return { ok: false, reason: "short", message: `El enlace debe tener al menos ${SLUG_MIN} caracteres.` };
  }
  if (slug.length > SLUG_MAX) {
    return { ok: false, reason: "long", message: `El enlace no puede superar los ${SLUG_MAX} caracteres.` };
  }
  if (!SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      reason: "chars",
      message: "Solo se permiten letras minúsculas, números y guiones, sin empezar ni terminar en guion.",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: "reserved", message: "Ese enlace está reservado por MUSA. Elige otro." };
  }
  return { ok: true };
}

/** Escapa comodines de ilike (%, _, \) para usar un valor literal en .ilike(). */
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type SlugDbClient = {
  from: (table: string) => any;
};

export type SlugAvailability =
  | { available: true; reclaimedFromOwnHistory: boolean }
  | { available: false; message: string };

/**
 * Comprueba disponibilidad de un slug normalizado contra Business y SlugHistory
 * (ambos case-insensitive). El slug público canónico vive en Business.slug
 * (migración 2026-06, PENDING_SQL §8). Un slug del historial de OTRO negocio
 * está ocupado (su redirección se rompería); el historial propio sí está
 * disponible. `admin` debe ser el admin client (bypasa RLS).
 */
export async function checkSlugAvailability(
  admin: SlugDbClient,
  normalized: string,
  businessId: string
): Promise<SlugAvailability> {
  const pattern = escapeIlike(normalized);

  const { data: bizRows, error: bizErr } = await admin
    .from("Business")
    .select("id")
    .ilike("slug", pattern)
    .limit(1);
  if (bizErr) throw bizErr;
  const biz = bizRows?.[0];
  if (biz && biz.id !== businessId) {
    return { available: false, message: "Ese enlace ya está en uso. Elige otro." };
  }

  const { data: historyRows, error: histErr } = await admin
    .from("SlugHistory")
    .select("id, businessId")
    .ilike("slug", pattern)
    .limit(1);
  if (histErr) throw histErr;
  const historyRow = historyRows?.[0];
  if (historyRow && historyRow.businessId !== businessId) {
    return { available: false, message: "Ese enlace ya está en uso. Elige otro." };
  }

  return { available: true, reclaimedFromOwnHistory: Boolean(historyRow) };
}
