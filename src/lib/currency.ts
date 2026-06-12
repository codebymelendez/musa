// Normalización de moneda para agregaciones de Payment.
// Regla de producto: NUNCA convertir entre monedas; reportar totales separados.
// La BD tiene valores históricos con casing mixto ('BS', 'Bs') — normalizar siempre antes de comparar.

export type NormalizedCurrency = "USD" | "BS";

export function normalizeCurrency(currency?: string | null): NormalizedCurrency {
  return (currency ?? "USD").toUpperCase() === "BS" ? "BS" : "USD";
}

export function isBs(currency?: string | null): boolean {
  return normalizeCurrency(currency) === "BS";
}

// ─── Formateo de precios ──────────────────────────────────────────────────────
// Fuente de verdad: Business.currency. 'BS' no es código ISO (el ISO es 'VES'),
// así que se formatea a mano con convención es-VE: "Bs 9.082,92".

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: "en-US", // "$12.50"
  EUR: "es-ES", // "12,50 €"
};

export function formatPrice(amount: number, currency?: string | null): string {
  const cur = (currency ?? "USD").toUpperCase();
  if (cur === "BS" || cur === "VES") {
    const [int, dec] = amount.toFixed(2).split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `Bs ${grouped},${dec}`;
  }
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[cur] ?? "es", {
      style: "currency",
      currency: cur,
    }).format(amount);
  } catch {
    // Código no ISO o inválido — degradar sin romper la UI
    return `${amount.toFixed(2)} ${cur}`;
  }
}

/** Símbolo de la moneda para prefijos de inputs ("$", "€", "Bs"). */
export function currencySymbol(currency?: string | null): string {
  const cur = (currency ?? "USD").toUpperCase();
  if (cur === "BS" || cur === "VES") return "Bs";
  try {
    const parts = new Intl.NumberFormat(LOCALE_BY_CURRENCY[cur] ?? "es", {
      style: "currency",
      currency: cur,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? cur;
  } catch {
    return cur;
  }
}

// ─── Doble moneda (Venezuela) ─────────────────────────────────────────────────
// El flujo USD + conversión a Bs por tasa BCV aplica SOLO a negocios venezolanos
// que cobran en USD. country null se asume VE para preservar el comportamiento
// histórico (toda la base instalada previa a Business.country es venezolana).
export function isDualCurrency(
  business?: { currency?: string | null; country?: string | null } | null
): boolean {
  const currency = (business?.currency ?? "USD").toUpperCase();
  const country = (business?.country ?? "VE").toUpperCase();
  return currency === "USD" && country === "VE";
}
