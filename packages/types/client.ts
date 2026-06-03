export interface Client {
  id: string
  businessId: string | null
  userId: string | null
  name: string
  phone: string
  email: string | null
  notes: string | null
  isActive: boolean
  preferences: string | null
  birthday: string | null
  tags: string[]
  wantsNotifications?: boolean
  createdAt: string
  updatedAt: string
}
