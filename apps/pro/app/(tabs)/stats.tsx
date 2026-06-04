import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { getStats, getUpcomingAppointments, type StatsData, type AppointmentItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, formatTime, formatShortDate } from '../../lib/utils'

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])
  return (
    <Animated.View style={{ opacity, paddingHorizontal: 20, paddingTop: 20 }}>
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.skeletonMetric} />
        ))}
      </View>
      {[1, 2].map(i => (
        <View key={i} style={[styles.skeletonBlock, { height: i === 1 ? 160 : 120 }]} />
      ))}
    </Animated.View>
  )
}

// ─── metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { fontFamily: MONO }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  )
}

// ─── period selector ──────────────────────────────────────────────────────────

type Period = 'month' | 'prev' | 'year'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'Este mes' },
  { key: 'prev',  label: 'Mes anterior' },
  { key: 'year',  label: 'Este año' },
]

function periodToYearMonth(p: Period): { year: number; month: number } {
  const now = new Date()
  if (p === 'prev') {
    const m = now.getMonth() === 0 ? 12 : now.getMonth()
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return { year: y, month: m }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; stats: StatsData; upcoming: AppointmentItem[] }

export default function StatsScreen() {
  const [period, setPeriod] = useState<Period>('month')
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (p: Period) => {
    setState({ kind: 'loading' })
    try {
      const { year, month } = periodToYearMonth(p)
      const [stats, upcoming] = await Promise.all([
        getStats(year, month),
        p === 'month' ? getUpcomingAppointments() : Promise.resolve([]),
      ])
      setState({ kind: 'ok', stats, upcoming })
    } catch { setState({ kind: 'error' }) }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const onRefresh = async () => { setRefreshing(true); await load(period); setRefreshing(false) }

  const revenue = state.kind === 'ok'
    ? (period === 'year' ? state.stats.yearlyRevenue : state.stats.monthlyRevenue)
    : 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estadísticas</Text>
      </View>

      {/* Period pills */}
      <View style={styles.periodWrap}>
        {PERIODS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.periodPill, period === key && styles.periodPillActive]}
            onPress={() => setPeriod(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === key && styles.periodTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {state.kind === 'loading' && <ScrollView><Skeleton /></ScrollView>}

      {state.kind === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.grayText}>No se pudieron cargar las estadísticas</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(period)} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.kind === 'ok' && (() => {
        const { stats, upcoming } = state
        const maxCount = stats.topServices[0]?.count ?? 1

        return (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
          >
            {/* Metrics grid */}
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Citas completadas"
                value={String(stats.completedAppointments)}
              />
              <MetricCard
                label={period === 'year' ? 'Ingresos del año' : 'Ingresos del mes'}
                value={`$${revenue.toFixed(0)}`}
              />
              <MetricCard
                label="Total clientas"
                value={String(stats.totalClients)}
              />
              <MetricCard
                label="Ticket promedio"
                value={`$${stats.avgTicket.toFixed(0)}`}
              />
            </View>

            {/* Top services */}
            {stats.topServices.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Servicios más solicitados</Text>
                {stats.topServices.map((svc, i) => (
                  <View key={i} style={styles.svcRow}>
                    <View style={styles.svcLeft}>
                      <Text style={styles.svcName}>{svc.serviceName}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[styles.barFill, { width: `${(svc.count / maxCount) * 100}%` }]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.svcCount, { fontFamily: MONO }]}>{svc.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Upcoming (only on current month) */}
            {period === 'month' && upcoming.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Próximas citas</Text>
                {upcoming.map(apt => (
                  <TouchableOpacity
                    key={apt.id}
                    style={styles.upcomingRow}
                    onPress={() => router.push(`/appointments/${apt.id}` as Parameters<typeof router.push>[0])}
                    activeOpacity={0.72}
                  >
                    <Text style={[styles.upcomingTime, { fontFamily: MONO }]}>
                      {formatShortDate(apt.startTime)} {formatTime(apt.startTime)}
                    </Text>
                    <View style={styles.upcomingRight}>
                      <Text style={styles.upcomingClient}>{apt.client.name}</Text>
                      <Text style={styles.upcomingService}>{apt.service.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => router.replace('/(tabs)/calendar' as Parameters<typeof router.replace>[0])}
                  activeOpacity={0.7}
                  style={styles.calendarLink}
                >
                  <Text style={styles.calendarLinkText}>Ver agenda completa →</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )
      })()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: SERIF, fontSize: 28, color: DARK },
  periodWrap: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff',
  },
  periodPill: {
    paddingHorizontal: 16, height: 34, borderRadius: 17,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  periodPillActive: { backgroundColor: PRIMARY },
  periodText: { fontSize: 13, fontWeight: '500', color: '#666' },
  periodTextActive: { color: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  metricValue: { fontSize: 28, color: DARK, marginBottom: 4 },
  metricLabel: { fontSize: 12, color: GRAY },
  metricSub: { fontSize: 11, color: '#AAAAAA', marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 14 },
  svcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  svcLeft: { flex: 1 },
  svcName: { fontSize: 14, color: DARK, marginBottom: 6 },
  barTrack: { height: 4, backgroundColor: '#EDE8E4', borderRadius: 2 },
  barFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  svcCount: { fontSize: 14, color: GRAY, minWidth: 24, textAlign: 'right' },
  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  upcomingTime: { fontSize: 12, color: GRAY, minWidth: 80 },
  upcomingRight: { flex: 1 },
  upcomingClient: { fontSize: 14, fontWeight: '500', color: DARK },
  upcomingService: { fontSize: 13, color: GRAY },
  calendarLink: { marginTop: 12, alignItems: 'flex-end' },
  calendarLinkText: { fontSize: 13, color: PRIMARY },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 15, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  skeletonMetric: { flex: 1, minWidth: '45%', height: 90, backgroundColor: '#F0EDE9', borderRadius: 16 },
  skeletonBlock: { backgroundColor: '#F0EDE9', borderRadius: 16, marginBottom: 14 },
})
