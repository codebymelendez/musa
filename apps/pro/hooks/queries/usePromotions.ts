import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPromotions, createPromotion, updatePromotion, deletePromotion, broadcastPromotion,
} from '../../lib/api'
import { keys } from './keys'

export function usePromotions() {
  return useQuery({
    queryKey: keys.promotions,
    queryFn: getPromotions,
  })
}

function useInvalidatePromotions() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.promotions })
    queryClient.invalidateQueries({ queryKey: keys.dashboard })
  }
}

export function useCreatePromotion() {
  const invalidate = useInvalidatePromotions()
  return useMutation({
    mutationFn: (data: Parameters<typeof createPromotion>[0]) => createPromotion(data),
    onSuccess: invalidate,
  })
}

export function useUpdatePromotion(id: string) {
  const invalidate = useInvalidatePromotions()
  return useMutation({
    mutationFn: (data: Parameters<typeof updatePromotion>[1]) => updatePromotion(id, data),
    onSuccess: invalidate,
  })
}

export function useDeletePromotion() {
  const invalidate = useInvalidatePromotions()
  return useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: invalidate,
  })
}

export function useBroadcastPromotion() {
  return useMutation({
    mutationFn: (promotionId: string) => broadcastPromotion(promotionId),
  })
}
