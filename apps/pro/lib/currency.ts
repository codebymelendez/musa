// ─── Moneda del negocio ───────────────────────────────────────────────────────
// ⚠️ Espejo de src/lib/currency.ts (web). No hay package compartido consumido
// por ambas apps — si cambias la semántica aquí, cámbiala también allí.
// Diferencia deliberada: aquí NO se usa Intl.NumberFormat con style:'currency'
// (datos de locale incompletos en Hermes/Android, mismo motivo que formatBs);
// el formato se construye a mano con la misma salida que produce la web.
//
// Fuente de verdad: Business.currency. 'BS' no es código ISO (el ISO es 'VES').

export type NormalizedCurrency = 'USD' | 'BS'

export function normalizeCurrency(currency?: string | null): NormalizedCurrency {
  return (currency ?? 'USD').toUpperCase() === 'BS' ? 'BS' : 'USD'
}

export function isBs(currency?: string | null): boolean {
  return normalizeCurrency(currency) === 'BS'
}

// "1234.5" → "1,234.50" (agrupación en-US: miles con coma, decimales con punto)
function groupEn(amount: number): string {
  const [int, dec] = amount.toFixed(2).split('.')
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`
}

// "1234.5" → "1.234,50" (agrupación es: miles con punto, decimales con coma)
function groupEs(amount: number): string {
  const [int, dec] = amount.toFixed(2).split('.')
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

// Misma salida que el formatPrice de la web:
//   USD → "$1,234.50" · EUR → "1.234,50 €" · BS/VES → "Bs 1.234,50" · otro → "1.234,50 XXX"
export function formatPrice(amount: number, currency?: string | null): string {
  const cur = (currency ?? 'USD').toUpperCase()
  if (cur === 'BS' || cur === 'VES') return `Bs ${groupEs(amount)}`
  if (cur === 'USD') return `$${groupEn(amount)}`
  if (cur === 'EUR') return `${groupEs(amount)} €`
  return `${groupEs(amount)} ${cur}`
}

/** Símbolo de la moneda para prefijos de inputs ("$", "€", "Bs"). */
export function currencySymbol(currency?: string | null): string {
  const cur = (currency ?? 'USD').toUpperCase()
  if (cur === 'BS' || cur === 'VES') return 'Bs'
  if (cur === 'USD') return '$'
  if (cur === 'EUR') return '€'
  return cur
}

// ─── Doble moneda (Venezuela) ─────────────────────────────────────────────────
// El flujo USD + conversión a Bs por tasa BCV aplica SOLO a negocios venezolanos
// que cobran en USD. country null se asume VE para preservar el comportamiento
// histórico (toda la base instalada previa a Business.country es venezolana).
export function isDualCurrency(
  business?: { currency?: string | null; country?: string | null } | null
): boolean {
  const currency = (business?.currency ?? 'USD').toUpperCase()
  const country = (business?.country ?? 'VE').toUpperCase()
  return currency === 'USD' && country === 'VE'
}
