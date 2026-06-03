export interface Service {
  id: string
  userId: string | null
  businessId: string | null
  name: string
  description: string | null
  category: string
  durationMin: number
  price: number
  currency: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}
