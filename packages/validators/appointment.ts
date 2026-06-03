import { z } from 'zod'
import type { Appointment } from '@musa/types'

export const appointmentStatusSchema = z.enum([
  'confirmed',
  'cancelled',
  'completed',
  'pending',
])

export const appointmentSchema = z.object({
  userId: z.string().min(1),
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: appointmentStatusSchema.default('confirmed'),
  notes: z.string().nullable().optional(),
})

export const appointmentUpdateSchema = appointmentSchema.partial().extend({
  status: appointmentStatusSchema.optional(),
  rescheduleToken: z.string().nullable().optional(),
  oldStartTime: z.string().datetime().nullable().optional(),
})

export type AppointmentInput = z.infer<typeof appointmentSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>

export function validateAppointment(data: unknown): Appointment {
  return appointmentSchema.parse(data) as unknown as Appointment
}
