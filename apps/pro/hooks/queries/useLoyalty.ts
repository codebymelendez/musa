import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getLoyaltyProgram, saveLoyaltyProgram, getLoyaltyAccounts, redeemLoyaltyReward,
} from '../../lib/api'
import { keys } from './keys'

export function useLoyaltyProgram() {
  return useQuery({
    queryKey: keys.loyalty.program,
    queryFn: getLoyaltyProgram,
  })
}

export function useLoyaltyAccounts(enabled = true) {
  return useQuery({
    queryKey: keys.loyalty.accounts,
    queryFn: getLoyaltyAccounts,
    enabled,
  })
}

export function useSaveLoyaltyProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof saveLoyaltyProgram>[0]) => saveLoyaltyProgram(data),
    onSuccess: (program) => {
      queryClient.setQueryData(keys.loyalty.program, program)
      queryClient.invalidateQueries({ queryKey: keys.loyalty.all })
      queryClient.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useRedeemLoyaltyReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (accountId: string) => redeemLoyaltyReward(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.loyalty.all })
    },
  })
}
