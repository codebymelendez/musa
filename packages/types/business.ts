export interface Business {
  id: string
  name: string
  slug: string
  category: string | null
  phone: string | null
  city: string | null
  address: string | null
  planId: string
  logoUrl: string | null
  currentMonthBookings?: number
  ownerSlug?: string | null
  instagramUrl?: string | null
  description?: string | null
  isActive?: boolean
  createdAt: string
  updatedAt: string
}
