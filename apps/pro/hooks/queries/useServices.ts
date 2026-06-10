import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getServices, createService, updateService, deleteService } from '../../lib/api'
import { keys } from './keys'

export function useServices() {
  return useQuery({
    queryKey: keys.services,
    queryFn: getServices,
  })
}

function useInvalidateServices() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.services })
    queryClient.invalidateQueries({ queryKey: keys.dashboard })
  }
}

export function useCreateService() {
  const invalidate = useInvalidateServices()
  return useMutation({
    mutationFn: (data: Parameters<typeof createService>[0]) => createService(data),
    onSuccess: invalidate,
  })
}

export function useUpdateService(id: string) {
  const invalidate = useInvalidateServices()
  return useMutation({
    mutationFn: (data: Parameters<typeof updateService>[1]) => updateService(id, data),
    onSuccess: invalidate,
  })
}

export function useDeleteService() {
  const invalidate = useInvalidateServices()
  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: invalidate,
  })
}
