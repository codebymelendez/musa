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
