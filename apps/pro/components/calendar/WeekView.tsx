import { memo, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { type AppointmentItem } from '../../lib/api'
import AppointmentCard from './AppointmentCard'
import { cap, weekDays, WLABELS } from './dateUtils'

const PRIMARY = '#B5593E'
const DARK    = '#34271E'
const SERIF   = Platform.select({ ios: 'Georgia', android: 'serif' }) as string

type WeekListItem =
  | { kind: 'header'; key: string; day: Date }
  | { kind: 'appt'; key: string; item: AppointmentItem }

const WeekView = memo(function WeekView({
  weekStart, selectedDate, dayMap, onSelectDay, businessTz,
}: {
  weekStart: Date
  selectedDate: Date
  dayMap: Map<string, AppointmentItem[]>
  onSelectDay: (d: Date) => void
  businessTz: string
}) {
  const todayKey    = new Intl.DateTimeFormat('sv-SE', { timeZone: businessTz }).format(new Date())
  const selectedKey = selectedDate.toISOString().split('T')[0]
  const days        = weekDays(weekStart)

  // Flatten day groups into a single virtualized list: a header row per day
  // followed by its appointment cards.
  const listItems = useMemo<WeekListItem[]>(() => {
    const items: WeekListItem[] = []
    for (const day of days) {
      const key = day.toISOString().split('T')[0]
      const appts = (dayMap.get(key) ?? [])
        .filter(a => a.status !== 'cancelled')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      if (!appts.length) continue
      items.push({ kind: 'header', key: `h-${key}`, day })
      for (const item of appts) items.push({ kind: 'appt', key: item.id, item })
    }
    return items
    // days derives from weekStart; dayMap is rebuilt per render upstream
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, dayMap])

  const renderItem = useCallback(({ item }: { item: WeekListItem }) => {
    if (item.kind === 'header') {
      return (
        <Text style={s.groupLabel}>
          {cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(item.day))}
        </Text>
      )
    }
    return <AppointmentCard item={item.item} tz={businessTz} />
  }, [businessTz])

  return (
    <View style={{ flex: 1 }}>
      {/* Horizontal Date Picker Capsule strip */}
      <View style={s.weekGrid}>
        {days.map((day, i) => {
          const key       = day.toISOString().split('T')[0]
          const appts     = dayMap.get(key) ?? []
          const hasDot    = appts.filter(a => a.status !== 'cancelled').length > 0
          const isT       = key === todayKey
          const isSel     = key === selectedKey

          const monShort  = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(day).toUpperCase().slice(0, 3)
          const dayName   = WLABELS[i]

          return (
            <TouchableOpacity
              key={i}
              style={[s.weekCellCapsule, (isT || isSel) && s.weekCellCapsuleActive]}
              onPress={() => onSelectDay(day)}
              activeOpacity={0.7}
            >
              <Text style={[s.wkLabelCapsule, (isT || isSel) && { color: 'rgba(255,255,255,0.7)' }]}>{monShort}</Text>
              <Text style={[s.wkNumCapsule, (isT || isSel) && { color: '#fff' }]}>{day.getUTCDate()}</Text>
              <Text style={[s.wkDayNameCapsule, (isT || isSel) && { color: 'rgba(255,255,255,0.8)' }]}>{dayName}</Text>
              {hasDot && <View style={[s.dotCapsule, (isT || isSel) && { backgroundColor: '#fff' }]} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Appointments list grouped by day (virtualized) */}
      <FlatList
        style={s.scroll}
        data={listItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        contentContainerStyle={[s.listContent, !listItems.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.centerState}>
            <Ionicons name="calendar-outline" size={52} color="#CCCCCC" />
            <Text style={s.emptyText}>Sin citas esta semana</Text>
          </View>
        }
      />
    </View>
  )
})

export default WeekView

const s = StyleSheet.create({
  scroll:      { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 88, flexGrow: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 72, gap: 16 },
  emptyText:   { fontSize: 15, color: '#AAAAAA' },

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

  groupLabel: { fontFamily: SERIF, fontSize: 15, color: DARK, paddingTop: 16, paddingBottom: 8 },
})
