export interface Plan {
  id: string
  name: string
  price: number
  currency: string
  limits?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
