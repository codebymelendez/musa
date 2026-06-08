import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export interface BusinessDayState {
  isOpen: boolean
  openTime: string
  closeTime: string
  isLoading: boolean
}

export function useBusinessDay(businessId: string | null, date: string, timezone: string): BusinessDayState {
  const [state, setState] = useState<BusinessDayState>({
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    isLoading: true,
  })

  useEffect(() => {
    if (!businessId) {
      setState({ isOpen: true, openTime: '09:00', closeTime: '18:00', isLoading: false })
      return
    }

    let active = true

    async function fetchDayInfo() {
      try {
        // 1. Check Exceptions
        const { data: exception } = await supabase
          .from('BusinessException')
          .select('isClosed, openTime, closeTime')
          .eq('businessId', businessId)
          .eq('date', date)
          .maybeSingle()

        if (!active) return

        if (exception) {
          setState({
            isOpen: !exception.isClosed,
            openTime: exception.openTime || '09:00',
            closeTime: exception.closeTime || '18:00',
            isLoading: false,
          })
          return
        }

        // 2. Check Regular Business Hours
        // Respect business timezone to interpret the day of week
        const startOfDay = fromZonedTime(`${date}T00:00:00`, timezone)
        const dayOfWeek = toZonedTime(startOfDay, timezone).getDay()

        const { data: hours } = await supabase
          .from('BusinessHours')
          .select('isOpen, openTime, closeTime')
          .eq('businessId', businessId)
          .eq('dayOfWeek', dayOfWeek)
          .is('userId', null)
          .maybeSingle()

        if (!active) return

        if (hours) {
          setState({
            isOpen: hours.isOpen,
            openTime: hours.openTime || '09:00',
            closeTime: hours.closeTime || '18:00',
            isLoading: false,
          })
        } else {
          // If no config found, assume closed
          setState({
            isOpen: false,
            openTime: '09:00',
            closeTime: '18:00',
            isLoading: false,
          })
        }
      } catch (err) {
        if (!active) return
        setState({
          isOpen: false,
          openTime: '09:00',
          closeTime: '18:00',
          isLoading: false,
        })
      }
    }

    setState(s => ({ ...s, isLoading: true }))
    fetchDayInfo()

    return () => {
      active = false
    }
  }, [businessId, date, timezone])

  return state
}
