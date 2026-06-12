import { router } from 'expo-router'
import { supabase } from './supabase'
import { clearPersistedCache } from './queryClient'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export function toVenezuelaDate(date: Date, tz = 'America/Caracas'): string {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(date)
  } catch {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Caracas' }).format(date)
  }
}

// Supabase returns timestamps without timezone suffix ("2026-06-05 13:00:00").
// JS parses those as LOCAL time instead of UTC. Add Z to force UTC interpretation.
export function normalizeISODate(dateStr: string): string {
  if (!dateStr) return dateStr
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) return dateStr
  return dateStr.replace(' ', 'T') + 'Z'
}

function normalizeAppointment(apt: AppointmentItem): AppointmentItem {
  return {
    ...apt,
    startTime: normalizeISODate(apt.startTime),
    endTime:   normalizeISODate(apt.endTime),
    createdAt: normalizeISODate(apt.createdAt),
    updatedAt: normalizeISODate(apt.updatedAt),
  }
}

export async function authHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function handle401(): Promise<void> {
  await supabase.auth.signOut()
  await clearPersistedCache()
  router.replace('/(auth)/login')
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending' | 'no_show' | 'rescheduled' | 'reprogrammed'

export interface AppointmentClient {
  id: string; name: string; phone: string; email: string | null
}

export interface AppointmentService {
  id: string; name: string; durationMin: number; price: number; currency: string
}

export interface AppointmentPayment {
  amount: number
  method: string
  currency: string
  isPaid: boolean
  notes?: string | null
  paidAt?: string | null
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
  const data: AppointmentItem[] = await res.json()
  return data.map(normalizeAppointment)
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
  return data.filter(a => a.status !== 'cancelled').slice(0, 3).map(normalizeAppointment)
}

export async function getAppointmentById(id: string): Promise<AppointmentItem | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const res = await fetch(`${API_URL}/api/appointments/${id}`, { headers })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null
  const data: AppointmentItem = await res.json()
  return normalizeAppointment(data)
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

export async function registerPayment(
  appointmentId: string,
  data: {
    amount: number
    method: string
    currency: string
    isPaid: boolean
    notes?: string
    completeAppointment: boolean
  }
): Promise<AppointmentItem | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const body: Record<string, unknown> = {
    ...(data.completeAppointment && { status: 'completed' }),
    payment: {
      amount: data.amount,
      method: data.method,
      currency: data.currency,
      isPaid: data.isPaid,
      ...(data.notes && { notes: data.notes }),
    },
  }
  const res = await fetch(`${API_URL}/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return getAppointmentById(appointmentId)
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
  birthday?: string | null
  createdAt?: string
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

export async function getAppointmentsInRange(from: string, to: string): Promise<AppointmentItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(
    `${API_URL}/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers }
  )
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) return []
  const data: AppointmentItem[] = await res.json()
  return data.map(normalizeAppointment)
}

export async function getClientById(id: string): Promise<ClientItem | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const res = await fetch(`${API_URL}/api/clients/${id}`, { headers })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null
  const data: ClientItem = await res.json()
  return {
    ...data,
    appointments: (data.appointments ?? []).map(normalizeAppointment),
  }
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

export async function updateClient(id: string, data: {
  name?: string; phone?: string; email?: string | null;
  birthday?: string | null; tags?: string[]; notes?: string;
}): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/clients/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface StatsData {
  monthlyRevenue: number
  monthlyRevenueBs?: number
  completedAppointments: number
  topServices: { serviceName: string; count: number }[]
  totalClients: number
  avgTicket: number
  avgTicketBs?: number
  yearlyRevenue: number
  yearlyRevenueBs?: number
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

export interface DashboardData {
  businessTz: string
  userName: string
  avatarUrl: string | null
  businessLogoUrl?: string | null
  businessCurrency?: string | null
  businessCountry?: string | null
  appointments: AppointmentItem[]
  promos: PromotionItem[]
  loyaltyProgram: LoyaltyProgram | null
  loyaltyStats: { clientsWithPoints: number; totalPoints: number }
  monthlyRevenue: number | null
  monthlyRevenueBs?: number | null
  weeklyRevenue: number | null
  weeklyRevenueBs?: number | null
  newClientsCount: number | null
}

export async function getDashboardData(): Promise<DashboardData> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/dashboard`, { headers })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: DashboardData = await res.json()
  return {
    ...data,
    appointments: (data.appointments || []).map(normalizeAppointment),
  }
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
  whatsapp: string | null
  instagram: string | null
  businessId: string | null
  business: {
    id: string; name: string; slug: string; city: string | null;
    address?: string | null;
    // Moneda y país del negocio — fuente de verdad para precios e isDualCurrency
    currency?: string | null;
    country?: string | null;
    logoUrl?: string | null;
    phone?: string | null;
    category?: string | null;
    plan?: { name: string; limits?: { maxMonthlyAppointments?: number; maxStaff?: number } } | null;
    planStatus?: string;
    planExpiresAt?: string | null;
    users?: TeamMember[];
    invitations?: TeamInvitation[];
  } | null
  latestPayment?: any | null
  settings: {
    workDays: number[]    // [0-6] where 0=Sunday
    startHour: number     // HHMM e.g. 800 = 08:00
    endHour: number       // HHMM e.g. 1700 = 17:00
    slotDuration: number  // minutes
    currency: string
    bookingEnabled: boolean
    paymentMethods: string[]
    timezone: string
  } | null
}

export function getBusinessTZ(settings: SettingsData | null): string {
  const tz = settings?.settings?.timezone ?? 'America/Caracas'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return tz
  } catch {
    return 'America/Caracas'
  }
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
  avatarUrl?: string
  whatsapp?: string
  instagram?: string
  businessName?: string
  businessAddress?: string
  settings?: {
    workDays?: number[]
    startHour?: number
    endHour?: number
    slotDuration?: number
    bookingEnabled?: boolean
    paymentMethods?: string[]
    timezone?: string
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

// ─── Slug del perfil público ─────────────────────────────────────────────────

export interface SlugCheckResult {
  available: boolean
  normalized: string
  reason?: string
}

export async function checkSlug(slug: string): Promise<SlugCheckResult> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/slug/check?slug=${encodeURIComponent(slug)}`, { headers })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Lanza con el mensaje del servidor tal cual (incluido el de cooldown con fecha)
export async function updateSlug(slug: string): Promise<{ slug: string }> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/business/slug`, {
    method: 'PATCH', headers, body: JSON.stringify({ slug }),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.user
}

// ─── BCV Rate ────────────────────────────────────────────────────────────────

export interface BcvRate { usd: number; fecha: string; stale?: boolean }

export async function getBcvRate(): Promise<BcvRate> {
  const headers = await authHeaders()
  if (!headers) throw new Error('No autenticado')
  const res = await fetch(`${API_URL}/api/bcv-rate`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as BcvRate
}

// ─── Services ─────────────────────────────────────────────────────────────────

export interface ServiceItem {
  id: string
  name: string
  durationMin: number
  price: number
  currency: string
  category: string
  description?: string | null
}

export async function getServices(): Promise<ServiceItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(`${API_URL}/api/services`, { headers })
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) return []
  return res.json()
}

export async function createService(data: {
  name: string; durationMin: number; price: number;
  description?: string; category?: string;
}): Promise<ServiceItem> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/services`, {
    method: 'POST', headers, body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateService(id: string, data: Partial<{
  name: string; durationMin: number; price: number;
  description: string; category: string;
}>): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/services/${id}`, {
    method: 'PATCH', headers, body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteService(id: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE', headers })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Create Appointment ───────────────────────────────────────────────────────

export async function createAppointment(data: {
  clientId?: string | null
  serviceId: string
  startTime: string
  endTime: string
  notes?: string
  status?: string
  businessId?: string
  businessTimezone?: string
}): Promise<{ id: string }> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/appointments`, {
    method: 'POST', headers,
    body: JSON.stringify({ status: 'confirmed', ...data }),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Promotions ───────────────────────────────────────────────────────────────

export interface PromotionItem {
  id: string
  title: string
  description: string | null
  discount: number
  validFrom: string | null
  validUntil: string | null
  isActive?: boolean
  createdAt: string
}

export async function getPromotions(): Promise<PromotionItem[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(`${API_URL}/api/promotions`, { headers })
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) return []
  const json = await res.json()
  return json.promotions ?? []
}

export async function createPromotion(data: {
  title: string; description?: string; discount: number;
  validFrom?: string; validUntil?: string;
}): Promise<PromotionItem> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/promotions`, {
    method: 'POST', headers, body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.promotion
}

export async function createClient(data: {
  name: string; phone: string; email?: string; notes?: string; tags?: string[]; birthday?: string;
}): Promise<ClientItem> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/clients`, {
    method: 'POST', headers, body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  const client = await res.json()
  return { ...client, appointments: client.appointments ?? [] }
}

export async function updatePromotion(id: string, data: Partial<{
  title: string; description: string; discount: number;
  validFrom: string; validUntil: string; isActive: boolean;
}>): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/promotions/${id}`, {
    method: 'PATCH', headers, body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deletePromotion(id: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/promotions/${id}`, { method: 'DELETE', headers })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function broadcastPromotion(promotionId: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/promotions/broadcast`, {
    method: 'POST', headers, body: JSON.stringify({ promotionId }),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string; name: string; email: string; appRole: string; createdAt: string;
}

export interface TeamInvitation {
  id: string; email: string; createdAt: string; status: string;
}

export async function inviteTeamMember(email: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/team/invite`, {
    method: 'POST', headers, body: JSON.stringify({ email, role: 'STAFF' }),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export interface LoyaltyProgram {
  id: string
  businessId: string
  name: string
  isActive: boolean
  accumulationType: 'visits' | 'points'
  pointsPerVisit: number
  rewardThreshold: number
  rewardDescription: string
  validUntil: string | null
  updatedAt: string
}

export interface LoyaltyAccount {
  id: string
  clientId: string
  businessId: string
  totalPoints: number
  lifetimePoints: number
  qrToken: string | null
  createdAt: string
  updatedAt: string
  client: { id: string; name: string; phone: string; email?: string | null } | null
  program: {
    id: string; name: string; rewardThreshold: number; pointsPerVisit: number;
    accumulationType: string; rewardDescription: string; isActive: boolean
  } | null
}

export async function getLoyaltyProgram(): Promise<LoyaltyProgram | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }
  const res = await fetch(`${API_URL}/api/loyalty/program`, { headers })
  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null
  const json = await res.json()
  return json.program ?? null
}

export async function saveLoyaltyProgram(data: {
  name?: string
  isActive?: boolean
  accumulationType?: 'visits' | 'points'
  pointsPerVisit?: number
  rewardThreshold?: number
  rewardDescription?: string
  validUntil?: string | null
}): Promise<LoyaltyProgram> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/loyalty/program`, {
    method: 'POST', headers, body: JSON.stringify(data),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.program
}

export async function getLoyaltyAccounts(): Promise<LoyaltyAccount[]> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return [] }
  const res = await fetch(`${API_URL}/api/loyalty/accounts`, { headers })
  if (res.status === 401) { await handle401(); return [] }
  if (!res.ok) return []
  const json = await res.json()
  return json.accounts ?? []
}

export async function findLoyaltyAccountByClientId(clientId: string): Promise<LoyaltyAccount | null> {
  const accounts = await getLoyaltyAccounts()
  return accounts.find(a => a.clientId === clientId) ?? null
}

export async function redeemLoyaltyReward(accountId: string): Promise<{ redemptionId: string; pointsUsed: number }> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/loyalty/redeem`, {
    method: 'POST', headers, body: JSON.stringify({ accountId }),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Storage (signed uploads vía API) ────────────────────────────────────────
// El cliente de Storage de supabase-js no adjunta la sesión en móvil (las
// subidas directas chocan con RLS); la API firma la subida y decide la ruta.

export type UploadKind = 'logo' | 'cover' | 'gallery' | 'avatar'

export interface SignedUpload {
  bucket: string
  path: string
  token: string
  signedUrl: string
  publicUrl: string
}

export async function getUploadUrl(kind: UploadKind, fileExt: string): Promise<SignedUpload> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/storage/upload-url`, {
    method: 'POST', headers, body: JSON.stringify({ kind, fileExt }),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function deleteStoragePhoto(path: string): Promise<{ storageDeleted: boolean; rowDeleted: boolean }> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); throw new Error('No auth') }
  const res = await fetch(`${API_URL}/api/storage/delete`, {
    method: 'POST', headers, body: JSON.stringify({ kind: 'gallery', path }),
  })
  if (res.status === 401) { await handle401(); throw new Error('Unauthorized') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Notifications (campanita) ───────────────────────────────────────────────
// Las lecturas van directo a Supabase (paginación + Realtime); los writes de
// "marcar leída" reutilizan el endpoint existente de la web.

export async function markNotificationRead(id: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/notifications`, {
    method: 'PATCH', headers, body: JSON.stringify({ id }),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function markAllNotificationsRead(): Promise<void> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return }
  const res = await fetch(`${API_URL}/api/notifications`, {
    method: 'PATCH', headers, body: JSON.stringify({ readAll: true }),
  })
  if (res.status === 401) { await handle401(); return }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Time slot helper ────────────────────────────────────────────────────────

export function generateTimeSlots(startHour: number, endHour: number, slotMin: number): string[] {
  const slots: string[] = []
  let h = Math.floor(startHour / 100)
  let m = startHour % 100
  const endMinutes = Math.floor(endHour / 100) * 60 + (endHour % 100)
  while (h * 60 + m < endMinutes) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    const total = h * 60 + m + slotMin
    h = Math.floor(total / 60)
    m = total % 60
  }
  return slots
}
