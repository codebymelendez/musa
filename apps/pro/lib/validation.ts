import { z } from 'zod'

// Esquemas de validación client-side (zod) para todo formulario que envía
// datos a la API. La API valida de nuevo server-side; esto corta requests
// malformados antes de salir del dispositivo y da mensajes en español.

// ─── primitivas reutilizables ─────────────────────────────────────────────────

// Teléfono: dígitos, espacios, +, -, paréntesis; 7–15 dígitos reales.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s\-()]+$/, 'El teléfono solo puede contener números, espacios, + y -')
  .refine(v => {
    const digits = v.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  }, 'El teléfono debe tener entre 7 y 15 dígitos')

export const emailSchema = z.string().trim().email('Ingresa un email válido')

// Fecha ISO YYYY-MM-DD que además sea una fecha real.
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'Fecha inválida')
  .refine(v => !isNaN(new Date(v.slice(0, 10) + 'T00:00:00').getTime()), 'Fecha inválida')

// Monto de pago: número positivo con máximo 2 decimales y techo sano.
export const amountSchema = z
  .number()
  .positive('El monto debe ser mayor a 0')
  .max(1_000_000, 'El monto es demasiado grande')
  .refine(v => Number.isFinite(v), 'Monto inválido')

// ─── formularios ──────────────────────────────────────────────────────────────

export const clientFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(200, 'El nombre es demasiado largo'),
  phone: phoneSchema,
  email: emailSchema.optional(),
  notes: z.string().max(2000, 'Las notas son demasiado largas').optional(),
  tags: z.array(z.string()).optional(),
  birthday: isoDateSchema.optional(),
})

export const paymentFormSchema = z.object({
  amount: amountSchema,
  method: z.string().min(1, 'Selecciona un método de pago'),
  currency: z.enum(['USD', 'BS'], { message: 'Moneda inválida' }),
  isPaid: z.boolean(),
  notes: z.string().max(500, 'Las notas son demasiado largas').optional(),
})

export const serviceFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(120, 'El nombre es demasiado largo'),
  durationMin: z.number().int('Duración inválida').min(5, 'La duración mínima es 5 minutos').max(600, 'La duración máxima es 10 horas'),
  price: z.number().min(0, 'El precio no puede ser negativo').max(1_000_000, 'El precio es demasiado grande'),
  description: z.string().max(1000, 'La descripción es demasiado larga').optional(),
})

export const promotionFormSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es requerido').max(150, 'El título es demasiado largo'),
    description: z.string().max(1000, 'La descripción es demasiado larga').optional(),
    discount: z.number().positive('El descuento debe ser mayor a 0').max(100, 'El descuento no puede superar el 100%'),
    validFrom: isoDateSchema.optional(),
    validUntil: isoDateSchema.optional(),
  })
  .refine(
    v => !v.validFrom || !v.validUntil || new Date(v.validUntil) >= new Date(v.validFrom),
    { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['validUntil'] }
  )

export const inviteFormSchema = z.object({
  email: emailSchema,
})

export const businessSettingsFormSchema = z.object({
  businessName: z.string().trim().min(1, 'El nombre del negocio es requerido').max(150, 'El nombre es demasiado largo'),
  businessAddress: z.string().max(300, 'La dirección es demasiado larga').optional(),
  bio: z.string().max(1000, 'La descripción es demasiado larga').optional(),
  whatsapp: z
    .string()
    .trim()
    .refine(v => v === '' || (/^[\d\s\-()]+$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15),
      'El WhatsApp debe tener entre 7 y 15 dígitos')
    .optional(),
  instagram: z
    .string()
    .trim()
    .refine(v => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v.replace(/^@/, '')),
      'Usuario de Instagram inválido')
    .optional(),
})

export const loyaltyFormSchema = z.object({
  isActive: z.boolean(),
  accumulationType: z.enum(['visits', 'points']),
  pointsPerVisit: z.number().int('Puntos inválidos').min(1, 'Los puntos por visita deben ser al menos 1').max(1000, 'Demasiados puntos por visita'),
  rewardThreshold: z.number().int('Umbral inválido').min(1, 'El umbral de canje debe ser al menos 1 punto').max(100_000, 'Umbral demasiado alto'),
  rewardDescription: z.string().trim().min(1, 'Describe el premio para las clientas').max(300, 'La descripción es demasiado larga'),
})

// ─── helper ───────────────────────────────────────────────────────────────────

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Valida y devuelve el primer error en español, listo para Alert.alert. */
export function validate<S extends z.ZodType>(schema: S, data: unknown): ValidationResult<z.infer<S>> {
  const result = schema.safeParse(data)
  if (result.success) return { ok: true, data: result.data }
  const first = result.error.issues[0]
  return { ok: false, error: first?.message ?? 'Datos inválidos' }
}
