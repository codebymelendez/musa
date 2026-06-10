import { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { type AppointmentItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, formatTime } from '../../lib/utils'

// One row of the "Agenda de hoy" card. The rows form a single visual card,
// so the first/last row carry the rounded corners and outer borders.
const AgendaRow = memo(function AgendaRow({
  apt, businessTz, isFirst, isLast, onPress,
}: {
  apt: AppointmentItem
  businessTz: string
  isFirst: boolean
  isLast: boolean
  onPress: (id: string) => void
}) {
  const isConfirmed = apt.status === 'confirmed'
  const isPending = apt.status === 'pending'
  const isCompleted = apt.status === 'completed'
  const leftColor = isConfirmed ? PRIMARY : isCompleted ? '#2D6A4F' : isPending ? '#D98B73' : '#6B2E1E'
  return (
    <View style={[styles.rowWrap, isFirst && styles.rowWrapFirst, isLast && styles.rowWrapLast]}>
      <TouchableOpacity
        style={[styles.agendaRow, { borderLeftColor: leftColor }, isLast && { borderBottomWidth: 0 }]}
        onPress={() => onPress(apt.id)}
        activeOpacity={0.7}
      >
        <View style={styles.agendaTimeWrap}>
          <Text style={[styles.agendaTime, { fontFamily: MONO }]}>{formatTime(apt.startTime, businessTz)}</Text>
        </View>
        <View style={styles.agendaContent}>
          <Text style={styles.agendaClient}>{apt.client?.name ?? '—'}</Text>
          <Text style={styles.agendaService}>{apt.service?.name ?? ''}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={16} color={GRAY} />
      </TouchableOpacity>
    </View>
  )
})

export default AgendaRow

const styles = StyleSheet.create({
  rowWrap: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
  },
  rowWrapFirst: {
    borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  rowWrapLast: {
    borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  agendaRow: {
    flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: 16,
    borderLeftWidth: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  agendaTimeWrap: { width: 60 },
  agendaTime: { fontSize: 13, color: DARK },
  agendaContent: { flex: 1, gap: 2 },
  agendaClient: { fontSize: 14, fontWeight: '500', color: DARK },
  agendaService: { fontSize: 12, color: GRAY },
})
