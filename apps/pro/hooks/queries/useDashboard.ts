import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../lib/api'
import { keys } from './keys'

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: getDashboardData,
  })
}
