import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  getAppointments,
  toVenezuelaDate,
  type AppointmentItem,
  type AppointmentStatus,
} from '../../lib/api'

// ─── date helpers ─────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatWeekday(date: Date): string {
  return capitalize(
    new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date)
  )
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Caracas',
  }).format(new Date(iso))
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// ─── status pill ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada',
  pending:   'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  confirmed: { bg: '#E8F5E9', text: '#2E7D32' },
  pending:   { bg: '#FFF8E1', text: '#8B6914' },
  cancelled: { bg: '#FDECEA', text: '#C62828' },
  completed: { bg: '#F5F5F5', text: '#757575' },
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  const { bg, text } = STATUS_COLORS[status]
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: text }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  )
}

// ─── appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({ item }: { item: AppointmentItem }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/appointments/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.72}
    >
      <View style={styles.cardRow}>
        <Text style={styles.timeText}>
          {formatTime(item.startTime)} — {formatTime(item.endTime)}
        </Text>
        <StatusPill status={item.status} />
      </View>
      <Text style={styles.clientName}>{item.client.name}</Text>
      <Text style={styles.serviceName}>{item.service.name}</Text>
    </TouchableOpacity>
  )
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonCards() {
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <>
      {[80, 55, 65].map((w, i) => (
        <Animated.View key={i} style={[styles.skeletonCard, { opacity }]}>
          <View style={[styles.skeletonLine, { width: `${w}%` }]} />
          <View style={[styles.skeletonLine, { width: '50%', marginTop: 6 }]} />
          <View style={[styles.skeletonLine, { width: '38%', marginTop: 4 }]} />
        </Animated.View>
      ))}
    </>
  )
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.centerState}>
      <Ionicons name="calendar-outline" size={52} color="#CCCCCC" />
      <Text style={styles.emptyText}>Sin citas para este día</Text>
    </View>
  )
}

// ─── error state ─────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.errorText}>No se pudieron cargar las citas</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={onRetry}
        activeOpacity={0.85}
      >
        <Text style={styles.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ok'; data: AppointmentItem[] }

export default function CalendarScreen() {
  const [date, setDate] = useState(new Date())
  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (d: Date) => {
    setState({ kind: 'loading' })
    try {
      const data = await getAppointments(toVenezuelaDate(d))
      setState({ kind: 'ok', data })
    } catch {
      setState({ kind: 'error' })
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load(date)
    setRefreshing(false)
  }

  const todayActive = isToday(date)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setDate(d => addDays(d, -1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Día anterior"
        >
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.weekday, todayActive && styles.weekdayActive]}>
            {formatWeekday(date)}
          </Text>
          <Text style={styles.headerDate}>{formatFullDate(date)}</Text>
        </View>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setDate(d => addDays(d, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Día siguiente"
        >
          <Ionicons name="chevron-forward-outline" size={24} color={DARK} />
        </TouchableOpacity>
      </View>

      {/* ── list ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {state.kind === 'loading' && <SkeletonCards />}

        {state.kind === 'error' && (
          <ErrorState onRetry={() => load(date)} />
        )}

        {state.kind === 'ok' && state.data.length === 0 && <EmptyState />}

        {state.kind === 'ok' &&
          state.data.map(item => (
            <AppointmentCard key={item.id} item={item} />
          ))}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={fabStyle}
        onPress={() => router.push('/appointments/new' as Parameters<typeof router.push>[0])}
        activeOpacity={0.85}
        accessibilityLabel="Nueva cita"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

// ─── constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#B5593E'
const DARK    = '#34271E'
const MONO    = Platform.select({ ios: 'Courier New', android: 'monospace' }) as string

// FAB outside StyleSheet so it can use absolute positioning on top of ScrollView
const fabStyle = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
}).fab

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E0DC',
  },
  navBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekday: {
    fontSize: 18,
    fontWeight: '500',
    color: DARK,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  weekdayActive: {
    color: PRIMARY,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999999',
    letterSpacing: 0.1,
  },

  // list
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // appointment card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8E4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontFamily: MONO,
    fontSize: 14,
    color: DARK,
    letterSpacing: 0.4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: DARK,
    marginBottom: 3,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '400',
    color: '#888888',
  },

  // status pill
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.15,
  },

  // skeleton
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8E4',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
  },
  skeletonLine: {
    height: 13,
    backgroundColor: '#EEEBE8',
    borderRadius: 6,
  },

  // centered states (empty / error)
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#AAAAAA',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },

  // retry CTA
  retryBtn: {
    height: 48,
    paddingHorizontal: 36,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
})
