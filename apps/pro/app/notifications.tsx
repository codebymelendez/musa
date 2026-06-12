import { useCallback, useMemo, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF, formatShortDate } from '../lib/utils'
import { Pulse, Bone } from '../components/ui/Skeleton'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import {
  useNotifications, useUnreadNotificationsCount, useMarkNotificationRead,
  useMarkAllNotificationsRead, useNotificationsRealtime, type NotificationItem,
} from '../hooks/queries'

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  return formatShortDate(iso)
}

// ─── item ────────────────────────────────────────────────────────────────────

const NotificationRow = memo(function NotificationRow({
  item, onPress,
}: {
  item: NotificationItem
  onPress: (item: NotificationItem) => void
}) {
  return (
    <TouchableOpacity
      style={[s.row, !item.read && s.rowUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={s.rowDotCol}>
        {!item.read && <View style={s.unreadDot} />}
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.rowText} numberOfLines={2}>{item.body}</Text>
        <Text style={s.rowTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {item.data?.appointmentId ? (
        <Ionicons name="chevron-forward-outline" size={16} color={GRAY} style={s.rowChevron} />
      ) : null}
    </TouchableOpacity>
  )
})

// ─── screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const {
    data, isLoading, isError, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  useNotificationsRealtime()

  const notifications = useMemo(
    () => (data?.pages ?? []).flat(),
    [data]
  )

  const handlePress = useCallback((item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id)
    if (item.data?.appointmentId) {
      router.push(`/appointments/${item.data.appointmentId}` as Parameters<typeof router.push>[0])
    }
  }, [markRead])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const loading = isLoading && !data

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={s.markAllBtn}
            onPress={() => markAllRead.mutate()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-done-outline" size={22} color={PRIMARY} />
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}
      </View>

      {loading ? (
        <View style={s.skeletonWrap}>
          {[0, 1, 2, 3, 4].map(i => (
            <Pulse key={i} style={s.skeletonRow}>
              <Bone width="60%" height={14} />
              <Bone width="90%" height={12} style={{ marginTop: 8 }} />
              <Bone width={70} height={10} style={{ marginTop: 8 }} />
            </Pulse>
          ))}
        </View>
      ) : isError && notifications.length === 0 ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <NotificationRow item={item} onPress={handlePress} />}
          contentContainerStyle={notifications.length === 0 ? s.listEmpty : s.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={PRIMARY} />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={PRIMARY} style={s.footerLoader} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="Sin notificaciones"
              subtitle="Aquí verás las novedades de tus citas: reservas nuevas, cancelaciones y reagendamientos."
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: SERIF, fontSize: 22, color: DARK },
  markAllBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingRight: 14, paddingLeft: 6,
    marginBottom: 10,
  },
  rowUnread: { backgroundColor: '#FDF6F3', borderColor: '#F0DDD5' },
  rowDotCol: { width: 22, alignItems: 'center', paddingTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '500', color: DARK },
  rowText: { fontSize: 13, color: GRAY, marginTop: 2, lineHeight: 18 },
  rowTime: { fontSize: 11, color: '#AAA39E', marginTop: 6 },
  rowChevron: { alignSelf: 'center', marginLeft: 6 },

  skeletonWrap: { padding: 16, gap: 10 },
  skeletonRow: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14,
  },
  footerLoader: { marginVertical: 16 },
})
