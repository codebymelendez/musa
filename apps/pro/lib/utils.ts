import { Platform } from 'react-native'

export const PRIMARY  = '#B5593E'
export const DARK     = '#34271E'
export const SURFACE  = '#FAF9F7'
export const BORDER   = '#EDE8E4'
export const GRAY     = '#888888'
export const MONO     = Platform.select({ ios: 'Courier New', android: 'monospace' }) as string
export const SERIF    = Platform.select({ ios: 'Georgia', android: 'serif' }) as string

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export function formatTime(iso: string, tz = 'America/Caracas'): string {
  return new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: tz,
  }).format(new Date(iso))
}

export function formatDate(iso: string, tz = 'America/Caracas'): string {
  return capitalize(
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: tz,
    }).format(new Date(iso))
  )
}

export function formatShortDate(iso: string, tz = 'America/Caracas'): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'short',
    timeZone: tz,
  }).format(new Date(iso))
}

export function formatMoney(amount: number, currency = 'USD'): string {
  return `$${amount.toFixed(2)}`
}

// ─── Moneda ──────────────────────────────────────────────────────────────────
// La BD tiene valores históricos con casing mixto ('BS', 'Bs').
// Nunca comparar currency con literales: usar siempre estos helpers.
export function normalizeCurrency(currency?: string | null): 'USD' | 'BS' {
  return (currency ?? 'USD').toUpperCase() === 'BS' ? 'BS' : 'USD'
}

export function isBs(currency?: string | null): boolean {
  return normalizeCurrency(currency) === 'BS'
}

// Formato es-VE: miles con punto, decimales con coma → "Bs 9.082,92"
// (sin Intl para evitar dependencia de datos de locale en Hermes/Android)
export function formatBs(amount: number): string {
  const [int, dec] = amount.toFixed(2).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Bs ${grouped},${dec}`
}

// ─── Métodos de pago ─────────────────────────────────────────────────────────
// La BD tiene mezcla de formato viejo (etiquetas: "Efectivo", "Pago Móvil",
// "Divisas") y nuevo (keys canónicas). Mapear + deduplicar siempre antes de
// usar la lista, y persistir solo keys canónicas.
// ⚠️ Mapa duplicado en src/lib/paymentMethods.ts (no hay package compartido
// consumido por ambas apps). Si cambias algo aquí, cámbialo también allí.

export const CANONICAL_PAYMENT_METHODS = [
  'efectivo_usd', 'efectivo_bs', 'pago_movil', 'zelle', 'transferencia', 'otro',
] as const

export type CanonicalPaymentMethod = (typeof CANONICAL_PAYMENT_METHODS)[number]

// Comparación case/acento-tolerante
function foldPaymentKey(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const LEGACY_PAYMENT_MAP: Record<string, CanonicalPaymentMethod> = {
  'efectivo': 'efectivo_usd',
  'divisas': 'efectivo_usd',
  'pago movil': 'pago_movil',
  'zelle': 'zelle',
  'transferencia': 'transferencia',
  'transferencia bancaria': 'transferencia',
}

export function normalizePaymentMethods(raw: unknown): CanonicalPaymentMethod[] {
  if (!Array.isArray(raw)) return []
  const out: CanonicalPaymentMethod[] = []
  for (const item of raw) {
    if (typeof item !== 'string' || !item.trim()) continue
    const folded = foldPaymentKey(item)
    let canonical: CanonicalPaymentMethod
    if ((CANONICAL_PAYMENT_METHODS as readonly string[]).includes(folded)) {
      canonical = folded as CanonicalPaymentMethod
    } else if (LEGACY_PAYMENT_MAP[folded]) {
      canonical = LEGACY_PAYMENT_MAP[folded]
    } else {
      canonical = 'otro'
      if (__DEV__) {
        console.error(`[paymentMethods] valor no reconocido → "otro": "${item}"`)
      }
    }
    if (!out.includes(canonical)) out.push(canonical)
  }
  return out
}

// HHMM integer (e.g. 830) → { h: '08', m: '30' }
export function hhmmToParts(hhmm: number): { h: string; m: string } {
  return {
    h: String(Math.floor(hhmm / 100)).padStart(2, '0'),
    m: String(hhmm % 100).padStart(2, '0'),
  }
}

// { h: '08', m: '30' } → 830
export function partsToHhmm(h: string, m: string): number {
  return (parseInt(h, 10) || 0) * 100 + (parseInt(m, 10) || 0)
}

export function hhmmToDisplay(hhmm: number): string {
  const { h, m } = hhmmToParts(hhmm)
  return `${h}:${m}`
}
