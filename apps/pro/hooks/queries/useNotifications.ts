import { useCallback, useEffect } from 'react'
import {
  useInfiniteQuery, useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import {
  markNotificationRead, markAllNotificationsRead, normalizeISODate,
} from '../../lib/api'
import { keys } from './keys'

export const NOTIFICATIONS_PAGE_SIZE = 20

export interface NotificationItem {
  id: string
  title: string
  body: string
  url: string | null
  data: { appointmentId?: string } | null
  read: boolean
  readAt: string | null
  createdAt: string
}

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

async function fetchNotificationsPage(page: number): Promise<NotificationItem[]> {
  const userId = await getUserId()
  if (!userId) return []
  const from = page * NOTIFICATIONS_PAGE_SIZE
  const { data, error } = await supabase
    .from('Notification')
    .select('id, title, body, url, data, read, readAt, createdAt')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .range(from, from + NOTIFICATIONS_PAGE_SIZE - 1)
  if (error) throw error
  return ((data ?? []) as NotificationItem[]).map(n => ({
    ...n,
    createdAt: normalizeISODate(n.createdAt),
  }))
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: keys.notifications.list,
    queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === NOTIFICATIONS_PAGE_SIZE ? pages.length : undefined,
  })
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: keys.notifications.unreadCount,
    queryFn: async () => {
      const userId = await getUserId()
      if (!userId) return 0
      const { count, error } = await supabase
        .from('Notification')
        .select('id', { count: 'exact', head: true })
        .eq('userId', userId)
        .eq('read', false)
      if (error) throw error
      return count ?? 0
    },
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    // Optimista: la fila se ve leída al instante
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: keys.notifications.all })
      qc.setQueryData<{ pages: NotificationItem[][]; pageParams: number[] }>(
        keys.notifications.list,
        old => old && {
          ...old,
          pages: old.pages.map(page =>
            page.map(n => (n.id === id ? { ...n, read: true } : n))
          ),
        }
      )
      qc.setQueryData<number>(keys.notifications.unreadCount, c => Math.max(0, (c ?? 1) - 1))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications.all }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: keys.notifications.all })
      qc.setQueryData<{ pages: NotificationItem[][]; pageParams: number[] }>(
        keys.notifications.list,
        old => old && {
          ...old,
          pages: old.pages.map(page => page.map(n => ({ ...n, read: true }))),
        }
      )
      qc.setQueryData<number>(keys.notifications.unreadCount, 0)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications.all }),
  })
}

// ─── Badge en tiempo real ─────────────────────────────────────────────────────
// Suscripción Realtime a INSERT en Notification (filtrada por userId), con
// fallback a refetch on focus por si Realtime no está habilitado para la tabla.
export function useNotificationsRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let cancelled = false

    getUserId().then(userId => {
      if (!userId || cancelled) return
      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Notification', filter: `userId=eq.${userId}` },
          () => qc.invalidateQueries({ queryKey: keys.notifications.all })
        )
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [qc])

  // Fallback: al volver el foco a la pantalla, refrescar el contador
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: keys.notifications.unreadCount })
    }, [qc])
  )
}
