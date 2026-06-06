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

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Caracas',
  }).format(new Date(iso))
}

export function formatDate(iso: string): string {
  return capitalize(
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'America/Caracas',
    }).format(new Date(iso))
  )
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'short',
    timeZone: 'America/Caracas',
  }).format(new Date(iso))
}

export function formatMoney(amount: number, currency = 'USD'): string {
  return `$${amount.toFixed(2)}`
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
