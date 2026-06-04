import { router } from 'expo-router'
import { supabase } from './supabase'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export function toVenezuelaDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Caracas',
  }).format(date)
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

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending'

export interface AppointmentClient {
  id: string
  name: string
  phone: string
  email: string | null
}

export interface AppointmentService {
  id: string
  name: string
  durationMin: number
  price: number
  currency: string
}

export interface AppointmentPayment {
  amount: number
  method: string
  isPaid: boolean
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

  return res.json() as Promise<AppointmentItem[]>
}

export async function getAppointmentById(id: string): Promise<AppointmentItem | null> {
  const headers = await authHeaders()
  if (!headers) { await handle401(); return null }

  const res = await fetch(`${API_URL}/api/appointments/${id}`, { headers })

  if (res.status === 401) { await handle401(); return null }
  if (!res.ok) return null

  return res.json() as Promise<AppointmentItem>
}
