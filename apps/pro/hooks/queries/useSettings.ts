import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSettings, updateSettings, getBcvRate, getBusinessTZ,
  type SettingsData, type SettingsPatch,
} from '../../lib/api'
import { isDualCurrency } from '../../lib/currency'
import { keys } from './keys'

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: getSettings,
  })
}

// Derives the business timezone from the (possibly still-loading) settings
// query. Falls back to America/Caracas exactly like getBusinessTZ does.
export function useBusinessTimezone(): string {
  const { data } = useSettings()
  return getBusinessTZ(data ?? null)
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    // Settings edits are low-risk: apply optimistically, roll back on error.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: keys.settings })
      const previous = queryClient.getQueryData<SettingsData | null>(keys.settings)
      if (previous) {
        queryClient.setQueryData<SettingsData>(keys.settings, {
          ...previous,
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.bio !== undefined && { bio: patch.bio }),
          ...(patch.avatarUrl !== undefined && { avatarUrl: patch.avatarUrl }),
          ...(patch.whatsapp !== undefined && { whatsapp: patch.whatsapp }),
          ...(patch.instagram !== undefined && { instagram: patch.instagram }),
          ...(patch.settings && previous.settings && {
            settings: { ...previous.settings, ...patch.settings },
          }),
        })
      }
      return { previous }
    },
    onError: (_err, _patch, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(keys.settings, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.settings })
    },
  })
}

// Moneda y país del negocio + si aplica el flujo dual USD/Bs (BCV).
export function useBusinessCurrency(): { currency: string; country: string | null; dual: boolean } {
  const { data } = useSettings()
  return {
    currency: (data?.business?.currency ?? 'USD').toUpperCase(),
    country: data?.business?.country ?? null,
    dual: isDualCurrency(data?.business),
  }
}

// La tasa BCV solo tiene sentido en el flujo dual venezolano — fuera de él
// la query queda deshabilitada aunque el caller pase enabled=true.
export function useBcvRate(enabled = true) {
  const { dual } = useBusinessCurrency()
  return useQuery({
    queryKey: keys.bcvRate,
    queryFn: getBcvRate,
    enabled: enabled && dual,
    staleTime: 30 * 60 * 1000,
  })
}
