import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  RefreshControl, Animated, StyleSheet, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  getAppointments, toVenezuelaDate, getSettings, getBusinessTZ,
  type AppointmentItem, type AppointmentStatus,
} from '../../lib/api'
import { useBusinessDay } from '../../hooks/useBusinessDay'
import { toZonedTime } from 'date-fns-tz'

// ─── module-level cache (survives view switches) ──────────────────────────────

const _cache = new Map<string, AppointmentItem[]>()

// ─── constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#B5593E'
const DARK    = '#34271E'
const SERIF   = Platform.select({ ios: 'Georgia', android: 'serif' }) as string
const MONO    = Platform.select({ ios: 'Courier New', android: 'monospace' }) as string

// ─── date helpers ─────────────────────────────────────────────────────────────

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

function formatWeekday(d: Date): string {
  return cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(d))
}
function formatFullDate(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}
function formatTime(iso: string, tz = 'America/Caracas'): string {
  return new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
  }).format(new Date(iso))
}
function isToday(d: Date): boolean {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r
}
function startOfWeek(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0)
  const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day))
  return r
}
function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const offset = (first.getDay() === 0 ? 7 : first.getDay()) - 1
  const cells: Date[] = []
  for (let i = offset; i > 0; i--) cells.push(addDays(first, -i))
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  let extra = 1
  while (cells.length % 7 !== 0) cells.push(addDays(last, extra++))
  return cells
}
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
function weekRangeLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const sm = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(monday)
  const em = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(sunday)
  const yr = sunday.getFullYear()
  if (monday.getMonth() === sunday.getMonth())
    return `${monday.getDate()} – ${sunday.getDate()} ${em} ${yr}`
  return `${monday.getDate()} ${sm} – ${sunday.getDate()} ${em} ${yr}`
}
function monthLabel(d: Date): string {
  return cap(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d))
}

// ─── status pill ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada', completed: 'Completada',
}
const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  confirmed: { bg: 'rgba(181, 89, 62, 0.1)', text: PRIMARY },
  pending:   { bg: 'rgba(217, 139, 115, 0.1)', text: '#D98B73' },
  cancelled: { bg: 'rgba(155, 35, 53, 0.1)', text: '#9B2335' },
  completed: { bg: 'rgba(45, 106, 79, 0.1)', text: '#2D6A4F' },
}
function StatusPill({ status }: { status: AppointmentStatus }) {
  const { bg, text } = STATUS_COLORS[status]
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: text }]}>{STATUS_LABEL[status]}</Text>
    </View>
  )
}

// ─── appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({ item, tz = 'America/Caracas' }: { item: AppointmentItem; tz?: string }) {
  const isConfirmed = item.status === 'confirmed'
  const isPending = item.status === 'pending'
  const isCompleted = item.status === 'completed'
  const leftColor = isConfirmed ? PRIMARY : isCompleted ? '#2D6A4F' : isPending ? '#D98B73' : '#6B2E1E'
  return (
    <TouchableOpacity
      style={[s.card, { borderLeftColor: leftColor }]}
      onPress={() => router.push(`/appointments/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.72}
    >
      <View style={s.cardRow}>
        <Text style={s.timeText}>{formatTime(item.startTime, tz)} — {formatTime(item.endTime, tz)}</Text>
        <StatusPill status={item.status} />
      </View>
      <Text style={s.clientName}>{item.client?.name ?? 'Sin nombre'}</Text>
      <Text style={s.serviceName}>{item.service?.name ?? 'Sin servicio'}</Text>
    </TouchableOpacity>
  )
}

// ─── skeleton / empty / error ─────────────────────────────────────────────────

function SkeletonCards() {
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]))
    a.start(); return () => a.stop()
  }, [opacity])
  return (
    <>
      {[80, 55, 65].map((w, i) => (
        <Animated.View key={i} style={[s.skeletonCard, { opacity }]}>
          <View style={[s.skeletonLine, { width: `${w}%` }]} />
          <View style={[s.skeletonLine, { width: '50%', marginTop: 6 }]} />
          <View style={[s.skeletonLine, { width: '38%', marginTop: 4 }]} />
        </Animated.View>
      ))}
    </>
  )
}
function EmptyDay() {
  return (
    <View style={s.centerState}>
      <Ionicons name="calendar-outline" size={52} color="#CCCCCC" />
      <Text style={s.emptyText}>Sin citas para este día</Text>
    </View>
  )
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={s.centerState}>
      <Text style={s.errorText}>No se pudieron cargar las citas</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={s.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── shared day-label row ─────────────────────────────────────────────────────

const WLABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// ─── week view ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, selectedDate, cacheVersion, onSelectDay, businessTz,
}: {
  weekStart: Date; selectedDate: Date; cacheVersion: number; onSelectDay: (d: Date) => void; businessTz: string
}) {
  const todayKey    = toVenezuelaDate(new Date())
  const selectedKey = toVenezuelaDate(selectedDate)
  const days        = weekDays(weekStart)

  const groups = days
    .map(day => ({
      day,
      appts: (_cache.get(toVenezuelaDate(day)) ?? [])
        .filter(a => a.status !== 'cancelled')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    }))
    .filter(g => g.appts.length > 0)

  return (
    <View style={{ flex: 1 }}>
      {/* Horizontal Date Picker Capsule strip */}
      <View style={s.weekGrid}>
        {days.map((day, i) => {
          const key       = toVenezuelaDate(day)
          const appts     = _cache.get(key) ?? []
          const hasDot    = appts.filter(a => a.status !== 'cancelled').length > 0
          const isT       = key === todayKey
          const isSel     = key === selectedKey

          // Month short representation
          const monShort  = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(day).toUpperCase().slice(0, 3)
          // Day name representation
          const dayName   = WLABELS[i]

          return (
            <TouchableOpacity
              key={i}
              style={[s.weekCellCapsule, (isT || isSel) && s.weekCellCapsuleActive]}
              onPress={() => onSelectDay(day)}
              activeOpacity={0.7}
            >
              <Text style={[s.wkLabelCapsule, (isT || isSel) && { color: 'rgba(255,255,255,0.7)' }]}>{monShort}</Text>
              <Text style={[s.wkNumCapsule, (isT || isSel) && { color: '#fff' }]}>{day.getDate()}</Text>
              <Text style={[s.wkDayNameCapsule, (isT || isSel) && { color: 'rgba(255,255,255,0.8)' }]}>{dayName}</Text>
              {hasDot && <View style={[s.dotCapsule, (isT || isSel) && { backgroundColor: '#fff' }]} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Appointments list grouped by day */}
      <ScrollView style={s.scroll} contentContainerStyle={[s.listContent, !groups.length && { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
        {!groups.length ? (
          <View style={s.centerState}>
            <Ionicons name="calendar-outline" size={52} color="#CCCCCC" />
            <Text style={s.emptyText}>Sin citas esta semana</Text>
          </View>
        ) : groups.map(({ day, appts }) => (
          <View key={toVenezuelaDate(day)}>
            <Text style={s.groupLabel}>
              {cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(day))}
            </Text>
            {appts.map(item => <AppointmentCard key={item.id} item={item} tz={businessTz} />)}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// ─── month view ───────────────────────────────────────────────────────────────

function MonthView({
  year, month, cacheVersion, onSelectDay,
}: {
  year: number; month: number; cacheVersion: number; onSelectDay: (d: Date) => void
}) {
  const todayKey = toVenezuelaDate(new Date())
  const rows     = chunk(monthCells(year, month), 7)

  return (
    <ScrollView style={s.scroll} contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 88 }} showsVerticalScrollIndicator={false}>
      {/* Day-of-week header */}
      <View style={s.monthHeaderRow}>
        {WLABELS.map(l => (
          <View key={l} style={s.monthHeaderCell}>
            <Text style={s.monthHeaderText}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      {rows.map((row, ri) => (
        <View key={ri} style={s.monthRow}>
          {row.map((day, ci) => {
            const key      = toVenezuelaDate(day)
            const appts    = _cache.get(key) ?? []
            const hasDot   = day.getMonth() === month && appts.filter(a => a.status !== 'cancelled').length > 0
            const isCur    = day.getMonth() === month
            const isT      = key === todayKey
            return (
              <TouchableOpacity key={ci} style={s.monthCell} onPress={() => onSelectDay(day)} activeOpacity={0.7}>
                <View style={[s.mnCircle, isT && s.mnCircleToday]}>
                  <Text style={[s.mnNum, !isCur && s.mnNumFaded, isT && s.mnNumToday]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={hasDot ? s.dot : s.dotEmpty} />
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
    </ScrollView>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type ViewMode    = 'day' | 'week' | 'month'
type ScreenState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: AppointmentItem[] }

export default function CalendarScreen() {
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

  const [view,         setView]         = useState<ViewMode>('day')
  const [date,         setDate]         = useState(today0)
  const [weekStart,    setWeekStart]    = useState(() => startOfWeek(new Date()))
  const [monthViewDt,  setMonthViewDt]  = useState(new Date())
  const [state,        setState]        = useState<ScreenState>({ kind: 'loading' })
  const [refreshing,   setRefreshing]   = useState(false)
  const [cacheVersion, setCacheVersion] = useState(0)
  const [businessTz,   setBusinessTz]   = useState('America/Caracas')
  const [businessId,   setBusinessId]   = useState<string | null>(null)

  useEffect(() => {
    getSettings()
      .then(s => {
        if (s) {
          setBusinessTz(getBusinessTZ(s))
          setBusinessId(s.businessId || s.business?.id || null)
        }
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async (d: Date, force = false) => {
    const key = toVenezuelaDate(d)
    if (!force && _cache.has(key)) {
      setState({ kind: 'ok', data: _cache.get(key)! })
      return
    }
    setState({ kind: 'loading' })
    try {
      const data = await getAppointments(key)
      _cache.set(key, data)
      setState({ kind: 'ok', data })
    } catch {
      setState({ kind: 'error' })
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  const dateStr = date.toISOString().split('T')[0]
  const businessDay = useBusinessDay(businessId, dateStr, businessTz)

  // Background fetch for week view
  useEffect(() => {
    if (view !== 'week') return
    const uncached = weekDays(weekStart).filter(d => !_cache.has(toVenezuelaDate(d)))
    if (!uncached.length) return
    Promise.all(
      uncached.map(d =>
        getAppointments(toVenezuelaDate(d))
          .then(data => { _cache.set(toVenezuelaDate(d), data) })
          .catch(() => {})
      )
    ).then(() => setCacheVersion(v => v + 1))
  }, [view, weekStart])

  const onRefresh = async () => {
    setRefreshing(true)
    _cache.delete(toVenezuelaDate(date))
    await load(date, true)
    setRefreshing(false)
  }

  function selectDay(d: Date) {
    const n = new Date(d); n.setHours(0, 0, 0, 0)
    setDate(n)
    setView('day')
  }

  function goBack() {
    if (view === 'day')   setDate(d => addDays(d, -1))
    if (view === 'week')  setWeekStart(d => addDays(d, -7))
    if (view === 'month') setMonthViewDt(d => addMonths(d, -1))
  }
  function goForward() {
    if (view === 'day')   setDate(d => addDays(d, 1))
    if (view === 'week')  setWeekStart(d => addDays(d, 7))
    if (view === 'month') setMonthViewDt(d => addMonths(d, 1))
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.navBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          {businessTz && businessTz !== 'UTC' && (
            <Text style={s.timezoneText}>Agenda · {businessTz}</Text>
          )}
          {view === 'day' && (
            <>
              <Text style={[s.weekday, isToday(date) && s.weekdayActive]}>{formatWeekday(date)}</Text>
              <Text style={s.headerDate}>{formatFullDate(date)}</Text>
            </>
          )}
          {view === 'week' && (
            <>
              <Text style={s.weekday}>Semana</Text>
              <Text style={s.headerDate}>{weekRangeLabel(weekStart)}</Text>
            </>
          )}
          {view === 'month' && (
            <Text style={s.weekday}>{monthLabel(monthViewDt)}</Text>
          )}
        </View>

        <TouchableOpacity style={s.navBtn} onPress={goForward} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward-outline" size={24} color={DARK} />
        </TouchableOpacity>
      </View>

      {/* ── view selector ── */}
      <View style={s.selector}>
        {(['day', 'week', 'month'] as ViewMode[]).map(v => {
          const label  = v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'
          const active = view === v
          return (
            <TouchableOpacity key={v} style={[s.pill2, active && s.pill2Active]} onPress={() => setView(v)} activeOpacity={0.8}>
              <Text style={[s.pill2Text, active && s.pill2TextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── day view ── */}
      {view === 'day' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {state.kind === 'loading' && <SkeletonCards />}
          {state.kind === 'error'   && <ErrorState onRetry={() => load(date)} />}
          {state.kind === 'ok' && (
            <View style={{ flex: 1 }}>
              {!businessDay.isOpen && (
                <View style={s.closedBanner}>
                  <Text style={s.closedBannerText}>Negocio cerrado</Text>
                </View>
              )}
              {(() => {
                const openHour = businessDay.openTime ? parseInt(businessDay.openTime.split(':')[0], 10) : 9
                const closeHour = businessDay.closeTime ? parseInt(businessDay.closeTime.split(':')[0], 10) : 18
                const startH = Math.min(8, openHour)
                const endH = Math.max(22, closeHour)
                const dayHours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)

                return dayHours.map(h => {
                  const hourStr = `${String(h).padStart(2, '0')}:00`
                  const isHourClosed = !businessDay.isOpen || hourStr < businessDay.openTime || hourStr >= businessDay.closeTime

                  // Find appointments that start in this hour in business timezone
                  const apptsInHour = state.data.filter(apt => {
                    const zonedStart = toZonedTime(new Date(apt.startTime), businessTz)
                    return zonedStart.getHours() === h
                  })

                  return (
                    <View key={h} style={s.hourRow}>
                      <View style={s.hourCol}>
                        <Text style={s.hourText}>{hourStr}</Text>
                      </View>
                      <View style={[s.contentCol, isHourClosed ? s.closedHourBg : s.openHourBg]}>
                        {apptsInHour.map(item => (
                          <AppointmentCard key={item.id} item={item} tz={businessTz} />
                        ))}
                      </View>
                    </View>
                  )
                })
              })()}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── week view ── */}
      {view === 'week' && (
        <WeekView weekStart={weekStart} selectedDate={date} cacheVersion={cacheVersion} onSelectDay={selectDay} businessTz={businessTz} />
      )}

      {/* ── month view ── */}
      {view === 'month' && (
        <MonthView year={monthViewDt.getFullYear()} month={monthViewDt.getMonth()} cacheVersion={cacheVersion} onSelectDay={selectDay} />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={fabStyle} onPress={() => router.push('/appointments/new' as Parameters<typeof router.push>[0])} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

// ─── fab ─────────────────────────────────────────────────────────────────────

const fabStyle = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
}).fab

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF9' },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E0DC',
  },
  navBtn:        { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerCenter:  { flex: 1, alignItems: 'center' },
  weekday:       { fontSize: 18, fontWeight: '500', color: DARK, letterSpacing: 0.2, marginBottom: 2 },
  weekdayActive: { color: PRIMARY },
  headerDate:    { fontSize: 13, color: '#999999', letterSpacing: 0.1 },

  // view selector
  selector: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E0DC',
  },
  pill2:          { flex: 1, height: 36, borderRadius: 18, backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center' },
  pill2Active:    { backgroundColor: PRIMARY },
  pill2Text:      { fontSize: 14, fontWeight: '500', color: '#666666' },
  pill2TextActive:{ color: '#fff' },

  // shared scroll + list
  scroll:      { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 88, flexGrow: 1 },

  // appointment card
  card:        { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E4', borderLeftWidth: 3, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  timeText:    { fontFamily: MONO, fontSize: 14, color: DARK, letterSpacing: 0.4 },
  clientName:  { fontSize: 16, fontWeight: '500', color: DARK, marginBottom: 3 },
  serviceName: { fontSize: 13, color: '#888888' },

  // status pill
  pill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.15 },

  // skeleton
  skeletonCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E4', paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10 },
  skeletonLine: { height: 13, backgroundColor: '#EEEBE8', borderRadius: 6 },

  // center states
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 72, gap: 16 },
  emptyText:   { fontSize: 15, color: '#AAAAAA' },
  errorText:   { fontSize: 15, color: '#888888', textAlign: 'center' },
  retryBtn:    { height: 48, paddingHorizontal: 36, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText:   { fontSize: 15, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.2 },

  // week grid
  weekGrid: {
    flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E0DC',
    gap: 6,
  },
  weekCellCapsule: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E4',
    backgroundColor: '#fff', height: 80,
  },
  weekCellCapsuleActive: {
    backgroundColor: PRIMARY, borderColor: PRIMARY,
  },
  wkLabelCapsule: { fontSize: 9, fontWeight: '600', color: '#AAAAAA', textTransform: 'uppercase' },
  wkNumCapsule: { fontSize: 16, fontWeight: '500', color: DARK, marginVertical: 2 },
  wkDayNameCapsule: { fontSize: 10, fontWeight: '500', color: '#AAAAAA' },
  dotCapsule: { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY, marginTop: 4 },

  // shared dot
  dot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: PRIMARY },
  dotEmpty: { width: 5, height: 5 },

  // week group label (Georgia/serif)
  groupLabel: { fontFamily: SERIF, fontSize: 15, color: DARK, paddingTop: 16, paddingBottom: 8 },

  // month grid
  monthHeaderRow:  { flexDirection: 'row', marginBottom: 4 },
  monthHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  monthHeaderText: { fontSize: 11, fontWeight: '500', color: '#AAAAAA' },
  monthRow:        { flexDirection: 'row' },
  monthCell:       { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 46 },
  mnCircle:        { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  mnCircleToday:   { backgroundColor: PRIMARY },
  mnNum:           { fontSize: 14, color: DARK },
  mnNumToday:      { color: '#fff' },
  mnNumFaded:      { color: '#CCCCCC' },
  timezoneText:    { fontSize: 11, color: '#888888', letterSpacing: 0.1, marginBottom: 2 },
  closedBanner:    { backgroundColor: 'rgba(181, 89, 62, 0.08)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(181, 89, 62, 0.2)' },
  closedBannerText:{ color: PRIMARY, fontSize: 13, fontWeight: '500' },
  hourRow:         { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDE8E4', minHeight: 64 },
  hourCol:         { width: 64, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#EDE8E4' },
  hourText:        { fontFamily: MONO, fontSize: 12, color: '#888888' },
  contentCol:      { flex: 1, padding: 6, gap: 6, justifyContent: 'center' },
  closedHourBg:    { backgroundColor: '#EDE8E4' },
  openHourBg:      { backgroundColor: '#FFFFFF' },
})
