// Normalización de métodos de pago de ProfessionalSettings.paymentMethods.
// La BD contiene mezcla de formato viejo (etiquetas: "Efectivo", "Pago Móvil",
// "Zelle", "Divisas") y nuevo (keys canónicas). Este módulo mapea legacy →
// canónico y deduplica, tanto en lectura (defensivo) como en escritura.
//
// ⚠️ Mapa duplicado en apps/pro/lib/utils.ts (no hay package compartido
// consumido por ambas apps). Si cambias algo aquí, cámbialo también allí.

export const CANONICAL_PAYMENT_METHODS = [
  "efectivo_usd",
  "efectivo_bs",
  "pago_movil",
  "zelle",
  "transferencia",
  "otro",
] as const;

export type CanonicalPaymentMethod = (typeof CANONICAL_PAYMENT_METHODS)[number];

// Comparación case/acento-tolerante: minúsculas, sin diacríticos, sin espacios extra
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const LEGACY_MAP: Record<string, CanonicalPaymentMethod> = {
  "efectivo": "efectivo_usd",
  "divisas": "efectivo_usd",
  "pago movil": "pago_movil",
  "zelle": "zelle",
  "transferencia": "transferencia",
  "transferencia bancaria": "transferencia",
};

/**
 * Mapea una lista cruda (legacy + canónica mezcladas) a keys canónicas
 * deduplicadas. Valores no reconocidos → "otro" (logueado en dev).
 */
export function normalizePaymentMethods(raw: unknown): CanonicalPaymentMethod[] {
  if (!Array.isArray(raw)) return [];
  const out: CanonicalPaymentMethod[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item.trim()) continue;
    const folded = fold(item);
    let canonical: CanonicalPaymentMethod;
    if ((CANONICAL_PAYMENT_METHODS as readonly string[]).includes(folded)) {
      canonical = folded as CanonicalPaymentMethod;
    } else if (LEGACY_MAP[folded]) {
      canonical = LEGACY_MAP[folded];
    } else {
      canonical = "otro";
      if (process.env.NODE_ENV !== "production") {
        console.error(`[paymentMethods] valor no reconocido → "otro": "${item}"`);
      }
    }
    if (!out.includes(canonical)) out.push(canonical);
  }
  return out;
}

/**
 * Parse defensivo del JSON almacenado en ProfessionalSettings.paymentMethods
 * + normalización. Nunca lanza.
 */
export function parsePaymentMethods(raw: string | null | undefined): CanonicalPaymentMethod[] {
  if (!raw) return [];
  try {
    return normalizePaymentMethods(JSON.parse(raw));
  } catch {
    return [];
  }
}
