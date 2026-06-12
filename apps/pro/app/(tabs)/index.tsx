import { useState, useCallback, useMemo } from 'react'
import { useFocusEffect } from 'expo-router'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { type AppointmentItem } from '../../lib/api'
import AddClientModal from '../../components/AddClientModal'
import HomeTopBar from '../../components/home/HomeTopBar'
import BentoStats from '../../components/home/BentoStats'
import AgendaRow from '../../components/home/AgendaRow'
import HomeFooter, { type QuickAction } from '../../components/home/HomeFooter'
import Skeleton from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { PRIMARY, DARK, SURFACE, GRAY, SERIF, formatTime, isBs } from '../../lib/utils'
import { useDashboard, useUnreadNotificationsCount, useNotificationsRealtime } from '../../hooks/queries'

// Saludo según la hora LOCAL del dispositivo (no la timezone del negocio):
// quien está en Madrid con negocio en Caracas debe ver "Buenos días" a sus 9:00.
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function HomeScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard()
  const [showAddClient, setShowAddClient] = useState(false)

  // Badge de la campanita: Realtime (INSERT en Notification) + refetch on focus
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  useNotificationsRealtime()

  // Recalculado al recuperar foco: con caché persistido de React Query el home
  // puede montar con datos de hace horas y el saludo quedaría congelado.
  const [greeting, setGreeting] = useState(getGreeting)
  useFocusEffect(useCallback(() => { setGreeting(getGreeting()) }, []))

  const loading = isLoading && !data
  const businessTz = data?.businessTz ?? 'America/Caracas'
  const userName = data?.userName ?? ''
  // Logo del negocio primero; foto personal solo como fallback
  const avatarUrl = data?.businessLogoUrl ?? data?.avatarUrl ?? null
  const appointments = data?.appointments
  const promos = data?.promos ?? []
  const weeklyRevenue = data?.weeklyRevenue ?? null
  const weeklyRevenueBs = data?.weeklyRevenueBs ?? null
  const monthlyRevenue = data?.monthlyRevenue ?? null
  const monthlyRevenueBs = data?.monthlyRevenueBs ?? null
  const newClientsCount = data?.newClientsCount ?? null

  const sortedAppts = useMemo(
    () => [...(appointments ?? [])].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    ),
    [appointments]
  )

  const { cobradoUSD, cobradoBs, completedSinCobro, nextApptLabel } = useMemo(() => {
    const appts = appointments ?? []
    const now = new Date()
    const next = sortedAppts.find(a => new Date(a.startTime) >= now) ?? sortedAppts[0] ?? null
    return {
      cobradoUSD: appts
        .filter(a => a.payment?.isPaid && !isBs(a.payment.currency))
        .reduce((s, a) => s + a.payment!.amount, 0),
      cobradoBs: appts
        .filter(a => a.payment?.isPaid && isBs(a.payment.currency))
        .reduce((s, a) => s + a.payment!.amount, 0),
      completedSinCobro: appts.filter(a => a.status === 'completed' && !a.payment).length,
      nextApptLabel: next ? `Siguiente a las ${formatTime(next.startTime, businessTz)}` : 'Día libre 🌿',
    }
  }, [appointments, sortedAppts, businessTz])

  const handleApptPress = useCallback((id: string) => {
    router.push(`/appointments/${id}` as Parameters<typeof router.push>[0])
  }, [])

  const renderItem = useCallback(({ item, index }: { item: AppointmentItem; index: number }) => (
    <AgendaRow
      apt={item}
      businessTz={businessTz}
      isFirst={index === 0}
      isLast={index === sortedAppts.length - 1}
      onPress={handleApptPress}
    />
  ), [businessTz, sortedAppts.length, handleApptPress])

  const keyExtractor = useCallback((item: AppointmentItem) => item.id, [])

  const quickActions = useMemo<QuickAction[]>(() => [
    {
      icon: 'add-circle-outline',
      label: 'Nueva Cita',
      onPress: () => router.push('/appointments/new' as Parameters<typeof router.push>[0]),
    },
    {
      icon: 'person-add-outline',
      label: 'Nueva Clienta',
      onPress: () => setShowAddClient(true),
    },
    {
      icon: 'pricetag-outline',
      label: 'Promociones',
      onPress: () => router.push('/promotions' as Parameters<typeof router.push>[0]),
    },
    {
      icon: 'bar-chart-outline',
      label: 'Estadísticas',
      onPress: () => router.push('/stats' as Parameters<typeof router.push>[0]),
    },
  ], [])

  const listHeader = (
    <View>
      {/* ─── Greeting & Profile ─── */}
      <View style={styles.greetingSection}>
        <Text style={styles.sublabel}>{greeting.toUpperCase()}</Text>
        <Text style={styles.greetingName}>{userName || 'Bienvenida'}</Text>
      </View>

      {/* ─── Bento Stats Grid ─── */}
      {loading ? (
        <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
          <Skeleton height={120} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton height={110} style={{ flex: 1 }} />
            <Skeleton height={110} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton height={86} style={{ flex: 1 }} />
            <Skeleton height={86} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <BentoStats
          appointmentsCount={sortedAppts.length}
          nextApptLabel={nextApptLabel}
          cobradoUSD={cobradoUSD}
          cobradoBs={cobradoBs}
          completedSinCobro={completedSinCobro}
          newClientsCount={newClientsCount}
          weeklyRevenue={weeklyRevenue}
          weeklyRevenueBs={weeklyRevenueBs}
          monthlyRevenue={monthlyRevenue}
          monthlyRevenueBs={monthlyRevenueBs}
        />
      )}

      {/* ─── Today's Agenda header ─── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>AGENDA DE HOY</Text>
        <TouchableOpacity onPress={() => router.push('/calendar' as Parameters<typeof router.push>[0])}>
          <Text style={styles.viewAllBtn}>VER TODO</Text>
        </TouchableOpacity>
      </View>

      {loading && <View style={{ paddingHorizontal: 20 }}><Skeleton height={60} style={{ marginBottom: 10 }} /></View>}
    </View>
  )

  const listEmpty = loading ? null : isError && !data ? (
    <ErrorState message="No se pudo cargar tu agenda" onRetry={() => refetch()} />
  ) : (
    <EmptyState
      icon="calendar-outline"
      title="La agenda está libre hoy"
      subtitle="Aprovecha para llenar tu día: agenda una cita en segundos."
      ctaLabel="Agendar una cita"
      onCtaPress={() => router.push('/appointments/new' as Parameters<typeof router.push>[0])}
    />
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeTopBar
        avatarUrl={avatarUrl}
        userName={userName}
        unreadCount={unreadCount}
        onBellPress={() => router.push('/notifications' as Parameters<typeof router.push>[0])}
      />

      <FlatList
        data={loading ? [] : sortedAppts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<HomeFooter promos={promos} quickActions={quickActions} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching} onRefresh={() => refetch()}
            tintColor={PRIMARY} colors={[PRIMARY]}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/appointments/new' as Parameters<typeof router.push>[0])}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddClientModal
        visible={showAddClient}
        onClose={() => setShowAddClient(false)}
        onCreated={() => {
          setShowAddClient(false)
        }}
      />
    </SafeAreaView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 100 },

  greetingSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  sublabel: { fontSize: 11, fontWeight: '600', color: GRAY, letterSpacing: 1.5 },
  greetingName: { fontFamily: SERIF, fontSize: 32, color: DARK, marginTop: 4 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: GRAY, letterSpacing: 0.8 },
  viewAllBtn: { fontSize: 11, fontWeight: '600', color: PRIMARY, letterSpacing: 0.5 },

  fab: {
    position: 'absolute', bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
})
