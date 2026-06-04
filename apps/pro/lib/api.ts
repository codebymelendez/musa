import { router } from 'expo-router'
import { supabase } from './supabase'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export function toVenezuelaDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Caracas' }).format(date)
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function handle401(): Promise<void> {
  await supabase.auth.signOut()
  router.replace('/(auth)/login')
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending'

export interface AppointmentClient {
  id: string; name: string; phone: string; email: string | null
}

export interface AppointmentService {
  id: string; name: string; durationMin: number; price: number; currency: string
}

export interface AppointmentPayment {
  amount: number; method: string; isPaid: boolean
}

export interface AppointmentItem {
  id: string
  userId: string
  clientId: string
  serviceId: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  client: AppointmentClient
  service: AppointmentService
  payment: AppointmentPayment | null
}

export async function getAppointments(date: string): Promise<AppointmentItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(`${API_URL}/api/appointments?date=${date}`, { headers })
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getUpcomingAppointments(limitDays = 7): Promise<AppointmentItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const from = new Date().toISOString()
  const to = new Date(Date.now() + limitDays * 86_400_000).toISOString()
  const res = await fetch(
    `${API_URL}/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers }
  )
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) return []
  const data: AppointmentItem[] = await res.json()
  return data.filter(a => a.status !== 'cancelled').slice(0, 3)
}

export async function getAppointmentById(id: string): Promise<AppointmentItem | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const res = await fetch(`${API_URL}/api/appointments/${id}`, { headers })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null
  return res.json()
}

// action = 'confirm' | 'cancel' — uses query param per backend contract
export async function triggerAppointmentAction(id: string, action: 'confirm' | 'cancel'): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/appointments/${id}/action?action=${action}`, {
    method: 'POST',
    headers,
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// 'complete' is not on the action endpoint — uses PATCH instead
export async function completeAppointment(id: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/appointments/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'completed' }),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export interface ClientItem {
  id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  tags: string[]
  appointments: AppointmentItem[]
}

export async function getClients(): Promise<ClientItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(`${API_URL}/api/clients`, { headers })
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getClientById(id: string): Promise<ClientItem | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const res = await fetch(`${API_URL}/api/clients/${id}`, { headers })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null
  return res.json()
}

export async function updateClientNotes(id: string, notes: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/clients/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ notes }),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface StatsData {
  monthlyRevenue: number
  completedAppointments: number
  topServices: { serviceName: string; count: number }[]
  totalClients: number
  avgTicket: number
  yearlyRevenue: number
  rescheduledThisMonth: number
  currency: string
}

export async function getStats(year: number, month: number): Promise<StatsData> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/stats?year=${year}&month=${month}`, { headers })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Settings / Profile ───────────────────────────────────────────────────────

export interface SettingsData {
  id: string
  name: string
  phone: string
  email: string
  slug: string
  appRole: string
  serviceType: string | null
  bio: string | null
  avatarUrl: string | null
  businessId: string | null
  business: { id: string; name: string; slug: string; city: string | null } | null
  settings: {
    workDays: number[]    // [0-6] where 0=Sunday
    startHour: number     // HHMM e.g. 800 = 08:00
    endHour: number       // HHMM e.g. 1700 = 17:00
    slotDuration: number  // minutes
    currency: string
    bookingEnabled: boolean
  } | null
}

export async function getSettings(): Promise<SettingsData | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const res = await fetch(`${API_URL}/api/settings`, { headers })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null
  return res.json()
}

export interface SettingsPatch {
  name?: string
  bio?: string
  businessName?: string
  settings?: {
    workDays?: number[]
    startHour?: number
    endHour?: number
    slotDuration?: number
  }
}

export async function updateSettings(data: SettingsPatch): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Services ─────────────────────────────────────────────────────────────────

export interface ServiceItem {
  id: string
  name: string
  durationMin: number
  price: number
  currency: string
  category: string
}

export async function getServices(): Promise<ServiceItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(`${API_URL}/api/services`, { headers })
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) return []
  return res.json()
}
