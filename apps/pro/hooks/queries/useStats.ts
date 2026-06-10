import { useQuery } from '@tanstack/react-query'
import { getStats } from '../../lib/api'
import { keys } from './keys'

export function useStats(year: number, month: number) {
  return useQuery({
    queryKey: keys.stats.byMonth(year, month),
    queryFn: () => getStats(year, month),
  })
}
