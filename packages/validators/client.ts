import { z } from 'zod'
import type { Client } from '@musa/types'

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(20),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
  preferences: z.string().nullable().optional(),
  birthday: z.string().date().nullable().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  wantsNotifications: z.boolean().default(false),
})

export const clientUpdateSchema = clientSchema.partial()

export type ClientInput = z.infer<typeof clientSchema>
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>

export function validateClient(data: unknown): ClientInput {
  return clientSchema.parse(data)
}
