import { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { router } from 'expo-router'
import { type AppointmentItem, type AppointmentStatus } from '../../lib/api'
import { formatTime } from './dateUtils'

const PRIMARY = '#B5593E'
const DARK    = '#34271E'
const MONO    = Platform.select({ ios: 'Courier New', android: 'monospace' }) as string

const STATUS_LABEL: Record<string, string> = {
  confirmed:    'Confirmada',
  pending:      'Pendiente',
  cancelled:    'Cancelada',
  completed:    'Completada',
  no_show:      'No asistió',
  rescheduled:  'Reprogramada',
  reprogrammed: 'Reprogramada',
}
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:    { bg: 'rgba(181, 89, 62, 0.1)', text: PRIMARY },
  pending:      { bg: 'rgba(217, 139, 115, 0.1)', text: '#D98B73' },
  cancelled:    { bg: 'rgba(155, 35, 53, 0.1)', text: '#9B2335' },
  completed:    { bg: 'rgba(45, 106, 79, 0.1)', text: '#2D6A4F' },
  no_show:      { bg: 'rgba(155, 35, 53, 0.08)', text: '#9B2335' },
  rescheduled:  { bg: 'rgba(21, 101, 192, 0.1)', text: '#1565C0' },
  reprogrammed: { bg: 'rgba(21, 101, 192, 0.1)', text: '#1565C0' },
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const colors = STATUS_COLORS[status] ?? { bg: 'rgba(45, 106, 79, 0.1)', text: '#2D6A4F' }
  return (
    <View style={[s.pill, { backgroundColor: colors.bg }]}>
      <Text style={[s.pillText, { color: colors.text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  )
}

const AppointmentCard = memo(function AppointmentCard({
  item, tz = 'America/Caracas',
}: {
  item: AppointmentItem
  tz?: string
}) {
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
})

export default AppointmentCard

const s = StyleSheet.create({
  card:        { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E4', borderLeftWidth: 3, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  timeText:    { fontFamily: MONO, fontSize: 14, color: DARK, letterSpacing: 0.4 },
  clientName:  { fontSize: 16, fontWeight: '500', color: DARK, marginBottom: 3 },
  serviceName: { fontSize: 13, color: '#888888' },
  pill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.15 },
})
