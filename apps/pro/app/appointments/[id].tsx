import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, ActivityIndicator, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import {
  getAppointmentById, triggerAppointmentAction, completeAppointment,
  type AppointmentItem, type AppointmentStatus,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, formatTime, formatDate, formatMoney } from '../../lib/utils'

// ─── status pill ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada', pending: 'Pendiente',
  cancelled: 'Cancelada', completed: 'Completada',
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
      <Text style={[styles.pillText, { color: text }]}>{STATUS_LABEL[status]}</Text>
    </View>
  )
}

// ─── section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[120, 80, 60, 100, 70].map((w, i) => (
        <View key={i} style={[styles.skeletonLine, { width: `${w * 0.6}%`, marginTop: i === 0 ? 0 : 14 }]} />
      ))}
    </View>
  )
}

// ─── payment method label ─────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  efectivo_bs: 'Efectivo Bs.',
  efectivo_usd: 'Efectivo USD',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  otro: 'Otro',
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ok'; data: AppointmentItem }

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setState({ kind: 'loading' })
    try {
      const data = await getAppointmentById(id)
      setState(data ? { kind: 'ok', data } : { kind: 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function doAction(action: 'confirm' | 'cancel' | 'complete') {
    if (!id) return
    setActing(true)
    try {
      if (action === 'complete') await completeAppointment(id)
      else await triggerAppointmentAction(id, action)
      await load()
    } catch {
      // non-blocking — could show a toast here
    } finally {
      setActing(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cita</Text>
        <View style={styles.backBtn} />
      </View>

      {state.kind === 'loading' && (
        <ScrollView contentContainerStyle={styles.content}><DetailSkeleton /></ScrollView>
      )}

      {state.kind === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>No se pudo cargar la cita</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.kind === 'ok' && (() => {
        const apt = state.data
        if (!apt.client || !apt.service) {
          return (
            <View style={styles.centerState}>
              <Text style={styles.errorText}>No se pudo cargar el detalle completo de la cita.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )
        }
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Client card */}
            <View style={styles.card}>
              <Text style={styles.clientName}>{apt.client?.name ?? 'Sin nombre'}</Text>
              {apt.client?.phone ? (
                <TouchableOpacity
                  style={styles.phoneRow}
                  onPress={() => Linking.openURL(`tel:${apt.client?.phone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={16} color={PRIMARY} />
                  <Text style={styles.phoneText}>{apt.client?.phone}</Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.divider} />
              <Text style={styles.serviceLabel}>{apt.service?.name ?? 'Sin servicio'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{apt.service?.durationMin ?? 0} min</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.metaText, { fontFamily: MONO }]}>
                  {formatMoney(apt.service?.price ?? 0, apt.service?.currency ?? 'USD')}
                </Text>
              </View>
            </View>

            {/* Date & time */}
            <Section title="Fecha y hora">
              <View style={styles.card}>
                <Text style={styles.dateText}>{formatDate(apt.startTime)}</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(apt.startTime)} — {formatTime(apt.endTime)}</Text>
                  <StatusPill status={apt.status} />
                </View>
              </View>
            </Section>

            {/* Notes */}
            {apt.notes ? (
              <Section title="Notas">
                <View style={styles.card}>
                  <Text style={styles.notesText}>{apt.notes}</Text>
                </View>
              </Section>
            ) : null}

            {/* Payment */}
            {apt.payment ? (
              <Section title="Pago">
                <View style={styles.card}>
                  <View style={styles.payRow}>
                    <Text style={styles.metaText}>
                      {METHOD_LABEL[apt.payment.method] ?? apt.payment.method}
                    </Text>
                    <Text style={[styles.payAmount, { fontFamily: MONO }]}>
                      {formatMoney(apt.payment.amount)}
                    </Text>
                  </View>
                  <Text style={[styles.metaText, { marginTop: 4, color: apt.payment.isPaid ? '#2E7D32' : GRAY }]}>
                    {apt.payment.isPaid ? '✓ Pagado' : 'Pendiente de pago'}
                  </Text>
                </View>
              </Section>
            ) : null}

            {/* Actions */}
            {apt.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btnPrimary, acting && styles.btnDisabled]}
                  onPress={() => doAction('confirm')}
                  disabled={acting}
                  activeOpacity={0.85}
                >
                  {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                    <Text style={styles.btnPrimaryText}>Confirmar cita</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnDanger, acting && styles.btnDisabled]}
                  onPress={() => doAction('cancel')}
                  disabled={acting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnDangerText}>Cancelar cita</Text>
                </TouchableOpacity>
              </View>
            )}

            {apt.status === 'confirmed' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btnPrimary, acting && styles.btnDisabled]}
                  onPress={() => doAction('complete')}
                  disabled={acting}
                  activeOpacity={0.85}
                >
                  {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                    <Text style={styles.btnPrimaryText}>Marcar como completada</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnDanger, acting && styles.btnDisabled]}
                  onPress={() => doAction('cancel')}
                  disabled={acting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnDangerText}>Cancelar cita</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '500', color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 12,
  },
  clientName: { fontFamily: SERIF, fontSize: 26, color: PRIMARY, marginBottom: 10 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  phoneText: { fontSize: 15, color: PRIMARY },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginBottom: 14 },
  serviceLabel: { fontSize: 16, fontWeight: '500', color: DARK, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: GRAY },
  metaDot: { fontSize: 14, color: BORDER },
  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: GRAY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeText: { fontFamily: SERIF, fontSize: 15, color: DARK },
  notesText: { fontSize: 15, color: DARK, lineHeight: 22 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payAmount: { fontSize: 17, color: DARK },
  actions: { marginTop: 8, gap: 10 },
  btnPrimary: {
    height: 52, backgroundColor: PRIMARY, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  btnDanger: {
    height: 52, borderRadius: 26, borderWidth: 1.5,
    borderColor: '#C62828', alignItems: 'center', justifyContent: 'center',
  },
  btnDangerText: { color: '#C62828', fontSize: 16, fontWeight: '500' },
  btnDisabled: { opacity: 0.55 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 },
  errorText: { fontSize: 15, color: GRAY, textAlign: 'center' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '500' },
  skeletonWrap: { gap: 12 },
  skeletonLine: { height: 16, backgroundColor: '#F0EDE9', borderRadius: 6 },
})
