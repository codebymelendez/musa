export type AppRole = 'owner' | 'staff' | 'client'

export interface User {
  id: string
  phone: string | null
  email: string | null
  name: string
  passwordHash: string | null
  slug: string
  role: string
  appRole?: AppRole
  businessId: string | null
  serviceType: string | null
  bio: string | null
  avatarUrl: string | null
  whatsapp: string | null
  instagram: string | null
  createdAt: string
  updatedAt: string
}

export interface ProfessionalSettings {
  id: string
  userId: string
  workDays: string
  startHour: number
  endHour: number
  slotDuration: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface Invitation {
  id: string
  businessId: string
  token: string
  code: string
  role: string
  expiresAt: string | null
  usedAt: string | null
  createdAt: string
}
