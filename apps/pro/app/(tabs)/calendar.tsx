import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { getAppointments, getBusinessTZ, type AppointmentItem } from '../../lib/api'
import { useBusinessDay } from '../../hooks/useBusinessDay'
import { useAppointments, useSettings, keys } from '../../hooks/queries'
import SkeletonCards from '../../components/calendar/SkeletonCards'
import WeekView from '../../components/calendar/WeekView'
import MonthView from '../../components/calendar/MonthView'
import DayTimeline from '../../components/calendar/DayTimeline'
import {
  getTodayInTZ, formatWeekday, formatFullDate, isToday,
  addDays, addMonths, startOfWeek, weekDays, weekRangeLabel, monthLabel,
} from '../../components/calendar/dateUtils'

const PRIMARY = '#B5593E'
const DARK    = '#34271E'

type ViewMode    = 'day' | 'week' | 'month'
type ScreenState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: AppointmentItem[] }

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

export default function CalendarScreen() {
  const [view,        setView]        = useState<ViewMode>('day')
  const [date,        setDate]        = useState(() => getTodayInTZ('America/Caracas'))
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(getTodayInTZ('America/Caracas')))
  const [monthViewDt, setMonthViewDt] = useState(() => getTodayInTZ('America/Caracas'))

  const { data: settings } = useSettings()
  const businessTz = settings ? getBusinessTZ(settings) : 'America/Caracas'
  const businessId = settings ? (settings.businessId || settings.business?.id || null) : null

  // Re-anchor "today" once we know the business timezone (mirrors the old
  // settings-loaded behavior). Runs once per mount.
  const anchored = useRef(false)
  useEffect(() => {
    if (!settings || anchored.current) return
    anchored.current = true
    const todayZoned = getTodayInTZ(getBusinessTZ(settings))
    setDate(todayZoned)
    setWeekStart(startOfWeek(todayZoned))
    setMonthViewDt(todayZoned)
  }, [settings])

  const dateStr = date.toISOString().split('T')[0]
  const dayQuery = useAppointments(dateStr)

  const state: ScreenState = dayQuery.data
    ? { kind: 'ok', data: dayQuery.data }
    : dayQuery.isError
      ? { kind: 'error' }
      : { kind: 'loading' }

  const businessDay = useBusinessDay(businessId, dateStr, businessTz)

  // Week view: fetch the 7 days in parallel; cached days render instantly.
  const weekDayKeys = useMemo(
    () => weekDays(weekStart).map(d => d.toISOString().split('T')[0]),
    [weekStart]
  )
  const weekQueries = useQueries({
    queries: weekDayKeys.map(key => ({
      queryKey: keys.appointments.byDate(key),
      queryFn: () => getAppointments(key),
      enabled: view === 'week',
    })),
  })
  const dayMap = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>()
    weekDayKeys.forEach((key, i) => {
      const d = weekQueries[i]?.data
      if (d) map.set(key, d)
    })
    return map
    // weekQueries is a new array each render; depend on its data refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDayKeys, ...weekQueries.map(q => q.data)])

  // Month view dots: read whatever days are already in the cache.
  const queryClient = useQueryClient()
  const getDayAppts = useCallback((key: string) =>
    queryClient.getQueryData<AppointmentItem[]>(keys.appointments.byDate(key)) ?? []
  , [queryClient])

  const onRefresh = useCallback(() => { dayQuery.refetch() }, [dayQuery.refetch])

  const selectDay = useCallback((d: Date) => {
    setDate(d)
    setView('day')
  }, [])

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
              <Text style={[s.weekday, isToday(date, businessTz) && s.weekdayActive]}>{formatWeekday(date)}</Text>
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
      {view === 'day' && state.kind === 'loading' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          <SkeletonCards />
        </ScrollView>
      )}
      {view === 'day' && state.kind === 'error' && (
        <ErrorState onRetry={() => dayQuery.refetch()} />
      )}
      {view === 'day' && state.kind === 'ok' && (
        <DayTimeline
          appointments={state.data}
          businessTz={businessTz}
          isOpen={businessDay.isOpen}
          startHourHHMM={settings?.settings?.startHour ?? 900}
          endHourHHMM={settings?.settings?.endHour ?? 1800}
          refreshing={dayQuery.isRefetching}
          onRefresh={onRefresh}
        />
      )}

      {/* ── week view ── */}
      {view === 'week' && (
        <WeekView weekStart={weekStart} selectedDate={date} dayMap={dayMap} onSelectDay={selectDay} businessTz={businessTz} />
      )}

      {/* ── month view ── */}
      {view === 'month' && (
        <MonthView year={monthViewDt.getUTCFullYear()} month={monthViewDt.getUTCMonth()} getDayAppts={getDayAppts} onSelectDay={selectDay} businessTz={businessTz} />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/appointments/new' as Parameters<typeof router.push>[0])} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

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
  timezoneText:  { fontSize: 11, color: '#888888', letterSpacing: 0.1, marginBottom: 2 },

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

  // center states
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 72, gap: 16 },
  errorText:   { fontSize: 15, color: '#888888', textAlign: 'center' },
  retryBtn:    { height: 48, paddingHorizontal: 36, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText:   { fontSize: 15, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.2 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
})
