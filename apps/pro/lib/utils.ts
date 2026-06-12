import { Platform } from 'react-native'

// ─── Enlace público del negocio ───────────────────────────────────────────────
// Único punto donde se construye la URL del perfil público (/p/<slug>).
// El slug canónico SIEMPRE sale de Business.slug; User.slug solo como
// fallback legacy en el call-site si el canónico aún no está.
export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app').replace(/\/$/, '')

export function getPublicProfileUrl(slug: string): string {
  return `${APP_URL}/p/${slug}`
}

// Variante legible para UI: "getmusa.app/p/<slug>" (sin protocolo)
export function getPublicProfileDisplay(slug: string): string {
  return getPublicProfileUrl(slug).replace(/^https?:\/\//, '')
}

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

// ─── Moneda ──────────────────────────────────────────────────────────────────
// Helpers canónicos en ./currency (espejo de src/lib/currency.ts).
// La BD tiene valores históricos con casing mixto ('BS', 'Bs').
// Nunca comparar currency con literales: usar siempre estos helpers.
import { formatPrice } from './currency'

export { normalizeCurrency, isBs, formatPrice, currencySymbol, isDualCurrency } from './currency'

// Delegado a formatPrice — único punto de formateo de importes.
export function formatMoney(amount: number, currency = 'USD'): string {
  return formatPrice(amount, currency)
}

// Formato es-VE: "Bs 9.082,92". Solo tiene sentido en contexto dual (Venezuela);
// fuera de dual usar formatPrice con la moneda del negocio.
export function formatBs(amount: number): string {
  return formatPrice(amount, 'BS')
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

// ─── Slug del perfil público ──────────────────────────────────────────────────
// ⚠️ Duplicado de src/lib/slug.ts para validación local instantánea en el móvil.
// El servidor revalida siempre en PATCH /api/business/slug — mantener en sincronía.

export const SLUG_MIN = 3
export const SLUG_MAX = 30

// 3–30 chars, solo a-z 0-9 y guiones, sin empezar/terminar en guion
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/

export const RESERVED_SLUGS = new Set([
  // Rutas reales en src/app (web)
  'api', 'appointments', 'auth', 'booking', 'calendar', 'cita', 'client',
  'clients', 'explore', 'forgot-password', 'home', 'login', 'loyalty',
  'notifications', 'onboarding', 'p', 'para-profesionales', 'profile',
  'promotions', 'reset-password', 'services', 'settings', 'sobre', 'staff',
  'stats', 'team',
  // Reservados de sistema/marca
  'admin', 'app', 'www', 'b', 's', 'logout', 'signup', 'register',
  'ajustes', 'negocio', 'business', 'perfil', 'ayuda', 'help', 'soporte',
  'support', 'legal', 'privacidad', 'terminos', 'getmusa', 'musa',
  'pago', 'pagos', 'planes', 'pricing',
])

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type SlugValidation =
  | { ok: true }
  | { ok: false; reason: 'short' | 'long' | 'chars' | 'reserved'; message: string }

// Valida un slug YA normalizado. Mensajes idénticos a los del servidor.
export function validateSlug(slug: string): SlugValidation {
  if (slug.length < SLUG_MIN) {
    return { ok: false, reason: 'short', message: `El enlace debe tener al menos ${SLUG_MIN} caracteres.` }
  }
  if (slug.length > SLUG_MAX) {
    return { ok: false, reason: 'long', message: `El enlace no puede superar los ${SLUG_MAX} caracteres.` }
  }
  if (!SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      reason: 'chars',
      message: 'Solo se permiten letras minúsculas, números y guiones, sin empezar ni terminar en guion.',
    }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: 'reserved', message: 'Ese enlace está reservado por MUSA. Elige otro.' }
  }
  return { ok: true }
}
