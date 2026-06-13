// ─── Promociones ──────────────────────────────────────────────────────────────
// ⚠️ Espejo de src/lib/promotions.ts (web). No hay package compartido consumido
// por ambas apps — si cambias la semántica aquí, cámbiala también allí.
//
// Promotion.discount es SIEMPRE un porcentaje (1–100).

export interface ActivatablePromotion {
  id: string
  title: string
  discount: number
  validFrom?: string | null
  validUntil?: string | null
  isActive?: boolean
}

/** Activa = isActive y `at` dentro de [validFrom, validUntil]. */
export function isPromotionActive(promo: ActivatablePromotion, at: Date = new Date()): boolean {
  if (promo.isActive === false) return false
  const t = at.getTime()
  if (promo.validFrom && t < new Date(promo.validFrom).getTime()) return false
  if (promo.validUntil && t > new Date(promo.validUntil).getTime()) return false
  return true
}

/** La promoción activa con mayor descuento, o null. */
export function bestActivePromotion<T extends ActivatablePromotion>(
  promotions: T[],
  at: Date = new Date()
): T | null {
  const active = promotions.filter((p) => isPromotionActive(p, at))
  if (active.length === 0) return null
  return active.reduce((best, p) => (p.discount > best.discount ? p : best))
}

/** Precio con descuento porcentual: redondeado a 2 decimales, nunca negativo. */
export function applyPromotionDiscount(price: number, discountPct: number): number {
  const discounted = price * (1 - discountPct / 100)
  return Math.max(0, Math.round(discounted * 100) / 100)
}

/** Nota estándar para Payment.notes, ej: "Promo: 2x1 pestañas (-20%)". */
export function promotionPaymentNote(promo: Pick<ActivatablePromotion, 'title' | 'discount'>): string {
  return `Promo: ${promo.title} (-${promo.discount}%)`
}
