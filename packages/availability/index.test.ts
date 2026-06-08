import test from 'node:test'
import assert from 'node:assert'
import { getAvailableSlots, isBusinessOpen, getBusinessTimezone } from './index'
import { SupabaseClient } from '@supabase/supabase-js'

// Simple mock builder for SupabaseClient
function createMockSupabase(responses: {
  business?: any
  exception?: any
  hours?: any
  service?: any
  users?: any[]
  appointments?: any[]
}) {
  const fromMock = (table: string) => {
    return {
      select: (fields: string) => {
        return {
          eq: (field1: string, val1: any) => {
            const chain = {
              eq: (field2: string, val2: any) => {
                const chain2 = {
                  is: (field3: string, val3: any) => {
                    const finalChain = {
                      maybeSingle: async () => {
                        if (table === 'BusinessException') return { data: responses.exception || null }
                        if (table === 'BusinessHours') return { data: responses.hours || null }
                        return { data: null }
                      },
                      single: async () => {
                        return { data: null }
                      }
                    }
                    return finalChain
                  },
                  maybeSingle: async () => {
                    if (table === 'BusinessException') return { data: responses.exception || null }
                    if (table === 'BusinessHours') return { data: responses.hours || null }
                    return { data: null }
                  },
                  single: async () => {
                    return { data: null }
                  }
                }
                return chain2
              },
              is: (field2: string, val2: any) => {
                const chain2 = {
                  maybeSingle: async () => {
                    if (table === 'BusinessHours') return { data: responses.hours || null }
                    return { data: null }
                  }
                }
                return chain2
              },
              single: async () => {
                if (table === 'Business') return { data: responses.business || null }
                if (table === 'Service') return { data: responses.service || null }
                return { data: null }
              },
              maybeSingle: async () => {
                if (table === 'BusinessException') return { data: responses.exception || null }
                return { data: null }
              }
            }
            return chain
          },
          in: (field1: string, val1: any) => {
            const chain = {
              neq: (field2: string, val2: any) => {
                const chain2 = {
                  gte: (field3: string, val3: any) => {
                    const chain3 = {
                      lte: (field4: string, val4: any) => {
                        return {
                          then: (resolve: any) => resolve({ data: responses.appointments || [] })
                        }
                      }
                    }
                    return chain3
                  }
                }
                return chain2
              }
            }
            return chain
          }
        }
      }
    }
  }

  return {
    from: fromMock
  } as unknown as SupabaseClient
}

test('getBusinessTimezone returns the timezone of the business', async () => {
  const mockDb = createMockSupabase({
    business: { id: 'b1', timezone: 'America/New_York' }
  })
  const tz = await getBusinessTimezone('b1', mockDb)
  assert.strictEqual(tz, 'America/New_York')
})

test('isBusinessOpen returns false if exception isClosed = true', async () => {
  const mockDb = createMockSupabase({
    business: { id: 'b1', timezone: 'America/Caracas' },
    exception: { isClosed: true }
  })
  const open = await isBusinessOpen('b1', '2026-06-08', mockDb)
  assert.strictEqual(open, false)
})

test('getAvailableSlots returns empty array when closed by exception', async () => {
  const mockDb = createMockSupabase({
    business: { id: 'b1', timezone: 'America/Caracas' },
    exception: { isClosed: true }
  })
  const slots = await getAvailableSlots({
    businessId: 'b1',
    date: '2026-06-08',
    serviceId: 's1',
    supabase: mockDb
  })
  assert.deepStrictEqual(slots, [])
})

test('getAvailableSlots returns empty array when closed by regular BusinessHours', async () => {
  const mockDb = createMockSupabase({
    business: { id: 'b1', timezone: 'America/Caracas' },
    exception: null,
    hours: { isOpen: false }
  })
  const slots = await getAvailableSlots({
    businessId: 'b1',
    date: '2026-06-08',
    serviceId: 's1',
    supabase: mockDb
  })
  assert.deepStrictEqual(slots, [])
})

test('getAvailableSlots returns full slots when business is free', async () => {
  const mockDb = createMockSupabase({
    business: { id: 'b1', timezone: 'America/Caracas' },
    exception: null,
    hours: { isOpen: true, openTime: '09:00', closeTime: '10:00' }, // 1 hour window
    service: { durationMin: 30, bufferMin: 15 }, // slot size 45 min
    users: [{ id: 'u1' }],
    appointments: []
  })
  // Let's hook the users query manually by returning it through our mock from function if needed
  // In our getAvailableSlots code:
  // supabase.from('User').select('id').eq('businessId', businessId)
  // Let's customize fromMock for User table:
  const originalFrom = mockDb.from
  mockDb.from = (table: string) => {
    if (table === 'User') {
      return {
        select: (fields: string) => ({
          eq: (field: string, val: any) => Promise.resolve({ data: [{ id: 'u1' }] })
        })
      } as any
    }
    return originalFrom(table)
  }

  const slots = await getAvailableSlots({
    businessId: 'b1',
    date: '2026-06-08',
    serviceId: 's1',
    supabase: mockDb
  })

  // Start times:
  // 09:00 -> End: 09:45 (Valid, since 09:45 <= 10:00)
  // 09:15 -> End: 10:00 (Valid, since 10:00 <= 10:00)
  // 09:30 -> End: 10:15 (Invalid, > 10:00)
  assert.strictEqual(slots.length, 2)
})

test('getAvailableSlots filters out occupied slots and respects buffer', async () => {
  const mockDb = createMockSupabase({
    business: { id: 'b1', timezone: 'America/Caracas' },
    exception: null,
    hours: { isOpen: true, openTime: '09:00', closeTime: '10:45' }, // 105 min window
    service: { durationMin: 30, bufferMin: 15 }, // slot size 45 min
    users: [{ id: 'u1' }],
    appointments: [
      {
        startTime: '2026-06-08 13:15:00', // occupies 09:15 - 09:45 local (13:15 - 13:45 UTC) + 15 min buffer = 10:00 local (14:00 UTC)
        endTime: '2026-06-08 13:45:00',
        bufferMin: 15
      }
    ]
  })

  const originalFrom = mockDb.from
  mockDb.from = (table: string) => {
    if (table === 'User') {
      return {
        select: (fields: string) => ({
          eq: (field: string, val: any) => Promise.resolve({ data: [{ id: 'u1' }] })
        })
      } as any
    }
    return originalFrom(table)
  }

  const slots = await getAvailableSlots({
    businessId: 'b1',
    date: '2026-06-08',
    serviceId: 's1',
    supabase: mockDb
  })

  // Candidates:
  // 09:00 -> End: 09:45 (Overlaps 09:15 - 10:00 -> Occupied)
  // 09:15 -> End: 10:00 (Overlaps -> Occupied)
  // 09:30 -> End: 10:15 (Overlaps -> Occupied)
  // 09:45 -> End: 10:30 (Does not overlap with 09:15-10:00 -> Free!)
  // 10:00 -> End: 10:45 (Invalid, > 10:30)
  assert.strictEqual(slots.length, 1)
})
