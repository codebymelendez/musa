import { memo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { type AppointmentItem } from '../../lib/api'
import { chunk, monthCells, WLABELS } from './dateUtils'

const PRIMARY = '#B5593E'
const DARK    = '#34271E'

// Fixed grid of ~42 cells — not a data list, so a ScrollView is fine.
const MonthView = memo(function MonthView({
  year, month, getDayAppts, onSelectDay, businessTz,
}: {
  year: number
  month: number
  getDayAppts: (key: string) => AppointmentItem[]
  onSelectDay: (d: Date) => void
  businessTz: string
}) {
  const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: businessTz }).format(new Date())
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
            const key      = day.toISOString().split('T')[0]
            const appts    = getDayAppts(key)
            const hasDot   = day.getUTCMonth() === month && appts.filter(a => a.status !== 'cancelled').length > 0
            const isCur    = day.getUTCMonth() === month
            const isT      = key === todayKey
            return (
              <TouchableOpacity key={ci} style={s.monthCell} onPress={() => onSelectDay(day)} activeOpacity={0.7}>
                <View style={[s.mnCircle, isT && s.mnCircleToday]}>
                  <Text style={[s.mnNum, !isCur && s.mnNumFaded, isT && s.mnNumToday]}>
                    {day.getUTCDate()}
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
})

export default MonthView

const s = StyleSheet.create({
  scroll: { flex: 1 },
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
  dot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: PRIMARY },
  dotEmpty: { width: 5, height: 5 },
})
