export interface Payment {
  id: string
  appointmentId: string
  amount: number
  currency: string
  method: string
  isPaid: boolean
  paidAt: string | null
  createdAt: string
  updatedAt: string
}
