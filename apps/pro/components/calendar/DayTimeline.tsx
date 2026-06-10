import { memo, useCallback, useMemo } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, Platform } from 'react-native'
import { toZonedTime } from 'date-fns-tz'
import { type AppointmentItem } from '../../lib/api'
import AppointmentCard from './AppointmentCard'

const PRIMARY = '#B5593E'
const MONO    = Platform.select({ ios: 'Courier New', android: 'monospace' }) as string

type HourRow = {
  hour: number
  hourStr: string
  isClosed: boolean
  appts: AppointmentItem[]
}

// Day view: hour-by-hour timeline. Same hour math as before the refactor —
// ProfessionalSettings (startHour/endHour as HHMM ints) defines open hours,
// appointments are bucketed by their start hour in the business timezone.
const DayTimeline = memo(function DayTimeline({
  appointments, businessTz, isOpen, startHourHHMM, endHourHHMM, refreshing, onRefresh,
}: {
  appointments: AppointmentItem[]
  businessTz: string
  isOpen: boolean
  startHourHHMM: number
  endHourHHMM: number
  refreshing: boolean
  onRefresh: () => void
}) {
  const rows = useMemo<HourRow[]>(() => {
    const openH   = Math.floor(startHourHHMM / 100)
    const closeH  = Math.floor(endHourHHMM / 100)
    const openTimeStr  = `${String(openH).padStart(2, '0')}:${String(startHourHHMM % 100).padStart(2, '0')}`
    const closeTimeStr = `${String(closeH).padStart(2, '0')}:${String(endHourHHMM % 100).padStart(2, '0')}`
    const startH = Math.min(8, openH)
    const endH   = Math.max(22, closeH)

    // Bucket appointments by start hour once, instead of filtering per row.
    const byHour = new Map<number, AppointmentItem[]>()
    for (const apt of appointments) {
      const h = toZonedTime(new Date(apt.startTime), businessTz).getHours()
      const bucket = byHour.get(h)
      if (bucket) bucket.push(apt)
      else byHour.set(h, [apt])
    }

    return Array.from({ length: endH - startH + 1 }, (_, i) => {
      const h = startH + i
      const hourStr = `${String(h).padStart(2, '0')}:00`
      return {
        hour: h,
        hourStr,
        isClosed: !isOpen || hourStr < openTimeStr || hourStr >= closeTimeStr,
        appts: byHour.get(h) ?? [],
      }
    })
  }, [appointments, businessTz, isOpen, startHourHHMM, endHourHHMM])

  const renderItem = useCallback(({ item }: { item: HourRow }) => (
    <View style={s.hourRow}>
      <View style={s.hourCol}>
        <Text style={s.hourText}>{item.hourStr}</Text>
      </View>
      <View style={[s.contentCol, item.isClosed ? s.closedHourBg : s.openHourBg]}>
        {item.appts.map(apt => (
          <AppointmentCard key={apt.id} item={apt} tz={businessTz} />
        ))}
      </View>
    </View>
  ), [businessTz])

  return (
    <FlatList
      style={s.scroll}
      data={rows}
      keyExtractor={item => String(item.hour)}
      renderItem={renderItem}
      contentContainerStyle={s.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={!isOpen ? (
        <View style={s.closedBanner}>
          <Text style={s.closedBannerText}>Negocio cerrado</Text>
        </View>
      ) : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
    />
  )
})

export default DayTimeline

const s = StyleSheet.create({
  scroll:      { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 88, flexGrow: 1 },
  closedBanner:    { backgroundColor: 'rgba(181, 89, 62, 0.08)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(181, 89, 62, 0.2)' },
  closedBannerText:{ color: PRIMARY, fontSize: 13, fontWeight: '500' },
  hourRow:         { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDE8E4', minHeight: 64 },
  hourCol:         { width: 64, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#EDE8E4' },
  hourText:        { fontFamily: MONO, fontSize: 12, color: '#888888' },
  contentCol:      { flex: 1, padding: 6, gap: 6, justifyContent: 'center' },
  closedHourBg:    { backgroundColor: '#EDE8E4' },
  openHourBg:      { backgroundColor: '#FFFFFF' },
})
