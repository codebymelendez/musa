import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keys } from './queries/keys'

export interface BusinessDayState {
  isOpen: boolean
  openTime: string
  closeTime: string
  isLoading: boolean
}

const DEFAULT_DAY = { isOpen: true, openTime: '09:00', closeTime: '18:00' }

async function fetchBusinessDay(businessId: string, date: string): Promise<Omit<BusinessDayState, 'isLoading'>> {
  // 1. Check Exceptions
  const { data: exception } = await supabase
    .from('BusinessException')
    .select('isClosed, openTime, closeTime')
    .eq('businessId', businessId)
    .eq('date', date)
    .maybeSingle()

  if (exception) {
    return {
      isOpen: !exception.isClosed,
      openTime: exception.openTime || '09:00',
      closeTime: exception.closeTime || '18:00',
    }
  }

  // 2. Check Regular Business Hours
  // Respect business timezone to interpret the day of week
  const [y, m, d] = date.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay()

  const { data: hours } = await supabase
    .from('BusinessHours')
    .select('isOpen, openTime, closeTime')
    .eq('businessId', businessId)
    .eq('dayOfWeek', dayOfWeek)
    .is('userId', null)
    .maybeSingle()

  if (hours) {
    return {
      isOpen: hours.isOpen,
      openTime: hours.openTime || '09:00',
      closeTime: hours.closeTime || '18:00',
    }
  }

  // If no config found, assume closed
  return { isOpen: false, openTime: '09:00', closeTime: '18:00' }
}

export function useBusinessDay(businessId: string | null, date: string, _timezone: string): BusinessDayState {
  const query = useQuery({
    queryKey: keys.businessDay(businessId, date),
    queryFn: () => fetchBusinessDay(businessId!, date),
    enabled: !!businessId,
  })

  if (!businessId) return { ...DEFAULT_DAY, isLoading: false }
  if (query.data) return { ...query.data, isLoading: false }
  // On error the old hook assumed closed; while loading it reported isLoading.
  if (query.isError) return { isOpen: false, openTime: '09:00', closeTime: '18:00', isLoading: false }
  return { ...DEFAULT_DAY, isLoading: true }
}
