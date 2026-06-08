import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { SupabaseClient } from '@supabase/supabase-js'

export function normalizeISODate(dateStr: string): string {
  if (!dateStr) return dateStr
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) return dateStr
  return dateStr.replace(' ', 'T') + 'Z'
}

export async function getBusinessTimezone(
  businessId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase
    .from('Business')
    .select('timezone')
    .eq('id', businessId)
    .single()

  if (error || !data) {
    throw new Error('Business not found')
  }
  return data.timezone || 'America/Caracas'
}

export async function isBusinessOpen(
  businessId: string,
  date: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const timezone = await getBusinessTimezone(businessId, supabase)

    // Check exceptions
    const { data: exception } = await supabase
      .from('BusinessException')
      .select('isClosed')
      .eq('businessId', businessId)
      .eq('date', date)
      .maybeSingle()

    if (exception) {
      return !exception.isClosed
    }

    // Check regular hours
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

    const { data: hours } = await supabase
      .from('BusinessHours')
      .select('isOpen')
      .eq('businessId', businessId)
      .eq('dayOfWeek', dayOfWeek)
      .is('userId', null)
      .maybeSingle()

    return hours ? hours.isOpen : false
  } catch {
    return false
  }
}

export async function getAvailableSlots(params: {
  businessId: string
  date: string        // format 'YYYY-MM-DD'
  serviceId: string
  supabase: SupabaseClient
}): Promise<Array<{ start: Date; end: Date }>> {
  const { businessId, date, serviceId, supabase } = params

  // PASO 1 — Obtener timezone del negocio
  const timezone = await getBusinessTimezone(businessId, supabase)

  // PASO 2 — Verificar BusinessException para esa fecha
  const { data: exception } = await supabase
    .from('BusinessException')
    .select('isClosed, openTime, closeTime')
    .eq('businessId', businessId)
    .eq('date', date)
    .maybeSingle()

  let openTimeStr: string | null = null
  let closeTimeStr: string | null = null

  if (exception) {
    if (exception.isClosed) {
      return []
    }
    openTimeStr = exception.openTime
    closeTimeStr = exception.closeTime
  }

  // PASO 3 — Verificar BusinessHours para el día de la semana
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

  if (!openTimeStr || !closeTimeStr) {
    const { data: hours } = await supabase
      .from('BusinessHours')
      .select('isOpen, openTime, closeTime')
      .eq('businessId', businessId)
      .eq('dayOfWeek', dayOfWeek)
      .is('userId', null)
      .maybeSingle()

    if (!hours || !hours.isOpen) {
      return []
    }
    openTimeStr = hours.openTime
    closeTimeStr = hours.closeTime
  }

  if (!openTimeStr || !closeTimeStr) {
    return []
  }

  // PASO 4 — Obtener el servicio
  const { data: service, error: sError } = await supabase
    .from('Service')
    .select('durationMin, bufferMin')
    .eq('id', serviceId)
    .single()

  if (sError || !service) {
    throw new Error('Service not found')
  }

  const serviceDurationTotal = service.durationMin + service.bufferMin

  // PASO 5 — Obtener citas existentes del día
  const { data: users } = await supabase
    .from('User')
    .select('id')
    .eq('businessId', businessId)

  const userIds = users?.map(u => u.id) || []
  let occupiedRanges: Array<{ start: Date; end: Date }> = []

  if (userIds.length > 0) {
    const startUtc = fromZonedTime(`${date}T00:00:00`, timezone)
    const endUtc = fromZonedTime(`${date}T23:59:59.999`, timezone)

    const { data: appointments } = await supabase
      .from('Appointment')
      .select('startTime, endTime, bufferMin')
      .in('userId', userIds)
      .neq('status', 'cancelled')
      .gte('startTime', startUtc.toISOString())
      .lte('startTime', endUtc.toISOString())

    occupiedRanges = (appointments ?? []).map(apt => {
      const start = new Date(normalizeISODate(apt.startTime))
      const end = new Date(normalizeISODate(apt.endTime))
      const endWithBuffer = new Date(end.getTime() + (apt.bufferMin || 0) * 60 * 1000)
      return { start, end: endWithBuffer }
    })
  }

  // PASO 6 — Generar slots disponibles
  const [openH, openM] = openTimeStr.split(':').map(Number)
  const [closeH, closeM] = closeTimeStr.split(':').map(Number)

  const startHourMinutes = openH * 60 + openM
  const endHourMinutes = closeH * 60 + closeM

  const availableSlots: Array<{ start: Date; end: Date }> = []

  for (let mins = startHourMinutes; mins < endHourMinutes; mins += 15) {
    const slotStartH = Math.floor(mins / 60)
    const slotStartM = mins % 60
    
    const slotStartStr = `${date}T${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}:00`
    const slotStartUtc = fromZonedTime(slotStartStr, timezone)
    const slotEndUtc = new Date(slotStartUtc.getTime() + serviceDurationTotal * 60 * 1000)
    
    const closeTimeUtc = fromZonedTime(`${date}T${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}:00`, timezone)
    
    if (slotEndUtc.getTime() > closeTimeUtc.getTime()) {
      continue
    }

    const isOccupied = occupiedRanges.some(occupied => {
      return slotStartUtc.getTime() < occupied.end.getTime() && slotEndUtc.getTime() > occupied.start.getTime()
    })
    
    if (!isOccupied) {
      availableSlots.push({ start: slotStartUtc, end: slotEndUtc })
    }
  }

  return availableSlots
}
