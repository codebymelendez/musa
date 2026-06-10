import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getClients, getClientById, createClient, updateClient, updateClientNotes,
  type ClientItem,
} from '../../lib/api'
import { keys } from './keys'

export function useClients() {
  return useQuery({
    queryKey: keys.clients.all,
    queryFn: getClients,
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: keys.clients.detail(id ?? ''),
    queryFn: () => getClientById(id!),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createClient>[0]) => createClient(data),
    onSuccess: (created) => {
      queryClient.setQueryData<ClientItem[]>(keys.clients.all, (prev) =>
        prev ? [created, ...prev] : [created]
      )
      queryClient.invalidateQueries({ queryKey: keys.clients.all })
      queryClient.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof updateClient>[1]) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.clients.all })
      queryClient.invalidateQueries({ queryKey: keys.clients.detail(id) })
    },
  })
}

export function useUpdateClientNotes(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notes: string) => updateClientNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.clients.all })
      queryClient.invalidateQueries({ queryKey: keys.clients.detail(id) })
    },
  })
}
