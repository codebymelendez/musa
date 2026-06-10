import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'

const HOUR = 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * HOUR,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'musa-pro-query-cache',
  throttleTime: 1_000,
})

// Queries whose first key segment is listed here never hit AsyncStorage:
// slots must always be fresh (booking correctness) and the BCV rate is cheap.
const NEVER_PERSIST = new Set(['availableSlots', 'bcv-rate'])

export function shouldDehydrateQuery(query: { queryKey: readonly unknown[]; state: { status: string } }): boolean {
  if (query.state.status !== 'success') return false
  return !NEVER_PERSIST.has(String(query.queryKey[0]))
}
