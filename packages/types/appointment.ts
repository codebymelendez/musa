export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending'

export interface Appointment {
  id: string
  userId: string
  clientId: string
  serviceId: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string | null
  rescheduleToken: string | null
  oldStartTime: string | null
  createdAt: string
  updatedAt: string
}
