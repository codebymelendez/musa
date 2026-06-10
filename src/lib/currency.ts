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
