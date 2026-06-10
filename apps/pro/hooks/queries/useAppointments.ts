import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAppointments, getAppointmentsInRange, getUpcomingAppointments,
  getAppointmentById, createAppointment, triggerAppointmentAction,
  completeAppointment, registerPayment,
  type AppointmentItem,
} from '../../lib/api'
import { keys, appointmentRelatedKeys } from './keys'

export function useAppointments(date: string) {
  return useQuery({
    queryKey: keys.appointments.byDate(date),
    queryFn: () => getAppointments(date),
  })
}

export function useAppointmentsInRange(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: keys.appointments.range(from, to),
    queryFn: () => getAppointmentsInRange(from, to),
    enabled,
  })
}

export function useUpcomingAppointments(enabled = true) {
  return useQuery({
    queryKey: keys.appointments.upcoming,
    queryFn: () => getUpcomingAppointments(),
    enabled,
  })
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: keys.appointments.detail(id ?? ''),
    queryFn: () => getAppointmentById(id!),
    enabled: !!id,
  })
}

function invalidateAppointmentData(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of appointmentRelatedKeys) {
    queryClient.invalidateQueries({ queryKey: key })
  }
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createAppointment>[0]) => createAppointment(data),
    onSuccess: () => invalidateAppointmentData(queryClient),
  })
}

// confirm / cancel — low-risk: optimistic status flip on the detail query
// with rollback on error.
export function useAppointmentAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: 'confirm' | 'cancel') => triggerAppointmentAction(id, action),
    onMutate: async (action) => {
      const detailKey = keys.appointments.detail(id)
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<AppointmentItem | null>(detailKey)
      if (previous) {
        queryClient.setQueryData<AppointmentItem>(detailKey, {
          ...previous,
          status: action === 'confirm' ? 'confirmed' : 'cancelled',
        })
      }
      return { previous }
    },
    onError: (_err, _action, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(keys.appointments.detail(id), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.appointments.detail(id) })
      invalidateAppointmentData(queryClient)
    },
  })
}

export function useCompleteAppointment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => completeAppointment(id),
    onMutate: async () => {
      const detailKey = keys.appointments.detail(id)
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<AppointmentItem | null>(detailKey)
      if (previous) {
        queryClient.setQueryData<AppointmentItem>(detailKey, { ...previous, status: 'completed' })
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(keys.appointments.detail(id), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.appointments.detail(id) })
      invalidateAppointmentData(queryClient)
    },
  })
}

export function useRegisterPayment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof registerPayment>[1]) => registerPayment(id, data),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(keys.appointments.detail(id), updated)
      }
      invalidateAppointmentData(queryClient)
    },
  })
}
