import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch,
  StyleSheet, Linking, ActivityIndicator, Platform, Alert, KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import {
  getAppointmentById, triggerAppointmentAction, completeAppointment, registerPayment,
  getSettings, getBusinessTZ,
  type AppointmentItem, type AppointmentStatus, type AppointmentPayment, type SettingsData,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, formatTime, formatDate, formatMoney } from '../../lib/utils'
import { cacheManager } from '../../lib/cache'

// ─── constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: 'efectivo_usd',  label: 'Efectivo USD',  icon: 'cash-outline' },
  { id: 'efectivo_bs',   label: 'Efectivo Bs',   icon: 'cash-outline' },
  { id: 'pago_movil',    label: 'Pago Móvil',    icon: 'phone-portrait-outline' },
  { id: 'zelle',         label: 'Zelle',         icon: 'swap-horizontal-outline' },
  { id: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { id: 'otro',          label: 'Otro',          icon: 'ellipsis-horizontal-outline' },
] as const

const METHOD_LABEL: Record<string, string> = {
  efectivo_bs:  'Efectivo Bs.',
  efectivo_usd: 'Efectivo USD',
  pago_movil:   'Pago Móvil',
  zelle:        'Zelle',
  transferencia:'Transferencia',
  otro:         'Otro',
}

// ─── status pill ──────────────────────────────────────────────────────────────

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
  confirmed:    { bg: '#E8F5E9', text: '#2E7D32' },
  pending:      { bg: '#FFF8E1', text: '#8B6914' },
  cancelled:    { bg: '#FDECEA', text: '#C62828' },
  completed:    { bg: '#F5F5F5', text: '#757575' },
  no_show:      { bg: '#FFF3E0', text: '#E65100' },
  rescheduled:  { bg: '#E3F2FD', text: '#1565C0' },
  reprogrammed: { bg: '#E3F2FD', text: '#1565C0' },
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F5F5F5', text: '#757575' }
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.pillText, { color: colors.text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  )
}

// ─── section label ────────────────────────────────────────────────────────────

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

// ─── payment summary — Estado B ───────────────────────────────────────────────

function PaymentSummary({
  payment,
  businessTz,
  onEdit,
}: {
  payment: AppointmentPayment
  businessTz: string
  onEdit?: () => void
}) {
  const isBs = payment.currency === 'Bs'
  const formattedAmount = isBs
    ? `Bs. ${payment.amount.toFixed(2)}`
    : `$${payment.amount.toFixed(2)} USD`

  return (
    <View style={ps.card}>
      <View style={ps.topRow}>
        <Text style={ps.registeredLabel}>COBRO REGISTRADO</Text>
        <Ionicons name="checkmark-circle-outline" size={20} color="#27AE60" />
      </View>

      <Text style={[ps.amount, { fontFamily: MONO }]}>{formattedAmount}</Text>
      <Text style={ps.method}>{METHOD_LABEL[payment.method] ?? payment.method}</Text>

      <View style={ps.statusRow}>
        {payment.isPaid ? (
          <Text style={ps.paidText}>Pagado ✓</Text>
        ) : (
          <Text style={ps.pendingText}>Pendiente de cobro</Text>
        )}
      </View>

      {payment.paidAt ? (
        <Text style={[ps.paidAt, { fontFamily: MONO }]}>
          {formatDate(payment.paidAt, businessTz)} · {formatTime(payment.paidAt, businessTz)}
        </Text>
      ) : null}

      {payment.notes ? (
        <Text style={ps.notes}>{payment.notes}</Text>
      ) : null}

      {onEdit && (
        <TouchableOpacity style={ps.editBtn} onPress={onEdit} activeOpacity={0.8}>
          <Text style={ps.editBtnText}>Editar cobro</Text>
        </TouchableOpacity>
      )}
    </View>
  )
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
  const insets = useSafeAreaInsets()

  // Timezone state — read cache synchronously so first render is already in business TZ
  const [businessTz, setBusinessTz] = useState(() => {
    const cached = cacheManager.get('settings')
    return cached ? getBusinessTZ(cached) : 'America/Caracas'
  })

  useEffect(() => {
    const cached = cacheManager.get('settings')
    if (cached) {
      setBusinessTz(getBusinessTZ(cached))
    } else {
      getSettings().then((s) => { if (s) setBusinessTz(getBusinessTZ(s)) }).catch(() => {})
    }
  }, [])

  // Payment form state
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'Bs'>('USD')
  const [method, setMethod] = useState<string | null>(null)
  const [isPaid, setIsPaid] = useState(true)
  const [payNotes, setPayNotes] = useState('')
  const [editingPayment, setEditingPayment] = useState(false)
  const [registering, setRegistering] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setState({ kind: 'loading' })
    try {
      const data = await getAppointmentById(id)
      setState(data ? { kind: 'ok', data } : { kind: 'error' })
      if (data && !data.payment) {
        setAmount(data.service?.price ? String(data.service.price) : '')
        setCurrency('USD')
        setMethod(null)
        setIsPaid(true)
        setPayNotes('')
        setEditingPayment(false)
      }
    } catch {
      setState({ kind: 'error' })
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function startEditPayment(payment: AppointmentPayment) {
    setAmount(String(payment.amount))
    setCurrency((payment.currency === 'Bs' ? 'Bs' : 'USD') as 'USD' | 'Bs')
    setMethod(payment.method)
    setIsPaid(payment.isPaid)
    setPayNotes(payment.notes ?? '')
    setEditingPayment(true)
  }

  async function doAction(action: 'confirm' | 'cancel') {
    if (!id) return
    setActing(true)
    try {
      await triggerAppointmentAction(id, action)
      cacheManager.invalidate('dashboard')
      cacheManager.invalidate('calendar')
      cacheManager.invalidate('stats')
      await load()
    } catch {
      // non-blocking
    } finally {
      setActing(false)
    }
  }

  async function handleRegisterPayment(apt: AppointmentItem) {
    if (!id) return
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('', 'El monto debe ser mayor a 0')
      return
    }
    if (!method) {
      Alert.alert('', 'Selecciona un método de pago')
      return
    }
    setRegistering(true)
    try {
      const updated = await registerPayment(id, {
        amount: parsedAmount,
        method,
        currency,
        isPaid,
        notes: payNotes.trim() || undefined,
        completeAppointment: apt.status === 'confirmed' && !editingPayment,
      })
      if (updated) {
        cacheManager.invalidate('dashboard')
        cacheManager.invalidate('calendar')
        cacheManager.invalidate('stats')
        setState({ kind: 'ok', data: updated })
        setEditingPayment(false)
      }
    } catch {
      Alert.alert('Error', 'No se pudo registrar el cobro. Intenta de nuevo.')
    } finally {
      setRegistering(false)
    }
  }

  function handleCompleteOnly() {
    Alert.alert(
      'Completar sin cobro',
      '¿Completar la cita sin registrar el cobro?\n\nPodrás añadirlo más tarde.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            if (!id) return
            setActing(true)
            try {
              await completeAppointment(id)
              cacheManager.invalidate('dashboard')
              cacheManager.invalidate('calendar')
              cacheManager.invalidate('stats')
              await load()
            } catch {
              Alert.alert('Error', 'No se pudo completar la cita')
            } finally { setActing(false) }
          },
        },
      ]
    )
  }

  const symbol = currency === 'Bs' ? 'Bs.' : '$'

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
        <Text style={styles.headerTitle}>Detalle de cita</Text>
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

        const showPaymentForm = apt.status === 'confirmed' && (!apt.payment || editingPayment)
        const showPaymentSummary = !!apt.payment && !showPaymentForm

        const _rawPayMethods = (cacheManager.get('settings') as SettingsData | null)?.settings?.paymentMethods
        const enabledPayMethods = _rawPayMethods !== undefined
          ? PAYMENT_METHODS.filter(m => _rawPayMethods.includes(m.id))
          : [...PAYMENT_METHODS]
        const noMethodsConfigured = _rawPayMethods !== undefined && enabledPayMethods.length === 0

        return (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
          >
            <ScrollView
              contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* 1. Client card */}
              <View style={styles.card}>
                <Text style={styles.clientName}>{apt.client.name}</Text>
                {apt.client.phone ? (
                  <TouchableOpacity
                    style={styles.phoneRow}
                    onPress={() => Linking.openURL(`tel:${apt.client!.phone}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={16} color={PRIMARY} />
                    <Text style={styles.phoneText}>{apt.client.phone}</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.divider} />
                <Text style={styles.serviceLabel}>{apt.service.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{apt.service.durationMin} min</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={[styles.metaText, { fontFamily: MONO }]}>
                    {formatMoney(apt.service.price, apt.service.currency)}
                  </Text>
                </View>
              </View>

              {/* 2. Date & time */}
              <Section title="Fecha y hora">
                <View style={styles.card}>
                  <Text style={styles.dateText}>{formatDate(apt.startTime, businessTz)}</Text>
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { fontFamily: MONO }]}>
                      {formatTime(apt.startTime, businessTz)} — {formatTime(apt.endTime, businessTz)}
                    </Text>
                    <StatusPill status={apt.status} />
                  </View>
                  <Text style={{ fontSize: 11, color: GRAY, marginTop: 8 }}>
                    Zona horaria del negocio: {businessTz}
                  </Text>
                </View>
              </Section>

              {/* 3. Notes */}
              {apt.notes ? (
                <Section title="Notas">
                  <View style={styles.card}>
                    <Text style={styles.notesText}>{apt.notes}</Text>
                  </View>
                </Section>
              ) : null}

              {/* 4. Payment section */}
              {apt.status !== 'cancelled' && (
                <>
                  {showPaymentSummary && apt.payment && (
                    <Section title="Cobro">
                      <PaymentSummary
                        payment={apt.payment}
                        businessTz={businessTz}
                        onEdit={apt.status === 'confirmed'
                          ? () => startEditPayment(apt.payment!)
                          : undefined
                        }
                      />
                    </Section>
                  )}

                  {showPaymentForm && (
                    <Section title={editingPayment ? 'Editar cobro' : 'Registrar cobro'}>
                      <View style={styles.formCard}>

                        {/* Amount row */}
                        <Text style={pf.label}>MONTO COBRADO</Text>
                        <View style={pf.amountRow}>
                          <Text style={[pf.currencySymbol, { fontFamily: MONO }]}>{symbol}</Text>
                          <TextInput
                            style={[pf.amountInput, { fontFamily: MONO }]}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder={apt.service.price ? String(apt.service.price) : '0.00'}
                            placeholderTextColor="#CCCCCC"
                          />
                        </View>

                        {/* Currency pills */}
                        <View style={pf.currencyRow}>
                          {(['USD', 'Bs'] as const).map(c => (
                            <TouchableOpacity
                              key={c}
                              style={[pf.currencyPill, currency === c && pf.currencyPillActive]}
                              onPress={() => setCurrency(c)}
                              activeOpacity={0.8}
                            >
                              <Text style={[pf.currencyPillText, currency === c && pf.currencyPillTextActive]}>
                                {c}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Payment method grid — filtered by business settings */}
                        <Text style={[pf.label, { marginTop: 16 }]}>MÉTODO DE PAGO</Text>
                        {noMethodsConfigured ? (
                          <View style={pf.noMethodsBox}>
                            <Ionicons name="settings-outline" size={16} color={GRAY} />
                            <Text style={pf.noMethodsText}>
                              Ningún método de pago habilitado.{'\n'}
                              Ve a Ajustes → Mi negocio para configurarlos.
                            </Text>
                          </View>
                        ) : (
                          <View style={pf.methodGrid}>
                            {enabledPayMethods.map(m => {
                              const active = method === m.id
                              return (
                                <TouchableOpacity
                                  key={m.id}
                                  style={[pf.methodPill, active && pf.methodPillActive]}
                                  onPress={() => setMethod(m.id)}
                                  activeOpacity={0.78}
                                >
                                  <Ionicons
                                    name={m.icon as React.ComponentProps<typeof Ionicons>['name']}
                                    size={14}
                                    color={active ? '#fff' : DARK}
                                  />
                                  <Text style={[pf.methodPillText, active && pf.methodPillTextActive]}>
                                    {m.label}
                                  </Text>
                                </TouchableOpacity>
                              )
                            })}
                          </View>
                        )}

                        {/* isPaid switch */}
                        <View style={pf.switchRow}>
                          <Text style={pf.switchLabel}>Marcar como pagado</Text>
                          <Switch
                            value={isPaid}
                            onValueChange={setIsPaid}
                            trackColor={{ false: '#EDE8E4', true: PRIMARY }}
                            thumbColor="#fff"
                          />
                        </View>
                        {!isPaid && (
                          <Text style={pf.switchHint}>Puedes marcarlo como pagado más tarde</Text>
                        )}

                        {/* Notes */}
                        <Text style={[pf.label, { marginTop: 16 }]}>
                          NOTAS{' '}
                          <Text style={{ color: '#AAAAAA', textTransform: 'none', fontSize: 11, fontWeight: '400' }}>
                            (opcional)
                          </Text>
                        </Text>
                        <TextInput
                          style={pf.notesInput}
                          value={payNotes}
                          onChangeText={v => setPayNotes(v.slice(0, 200))}
                          multiline
                          placeholder="Observaciones del cobro..."
                          placeholderTextColor="#AAAAAA"
                          textAlignVertical="top"
                        />

                        {/* Primary CTA */}
                        <TouchableOpacity
                          style={[pf.primaryBtn, (registering || noMethodsConfigured) && pf.btnDisabled]}
                          onPress={() => handleRegisterPayment(apt)}
                          disabled={registering || acting || noMethodsConfigured}
                          activeOpacity={0.85}
                        >
                          {registering
                            ? <ActivityIndicator color="#fff" size="small" />
                            : (
                              <Text style={pf.primaryBtnText}>
                                {editingPayment
                                  ? 'Actualizar cobro'
                                  : 'Completar cita y registrar cobro'}
                              </Text>
                            )
                          }
                        </TouchableOpacity>

                        {/* Secondary — complete without payment */}
                        {!editingPayment && (
                          <TouchableOpacity
                            style={[pf.secondaryBtn, (acting || registering) && pf.btnDisabled]}
                            onPress={handleCompleteOnly}
                            disabled={acting || registering}
                            activeOpacity={0.8}
                          >
                            <Text style={pf.secondaryBtnText}>Completar cita sin registrar pago</Text>
                          </TouchableOpacity>
                        )}

                        {/* Cancel edit */}
                        {editingPayment && (
                          <TouchableOpacity
                            style={[pf.secondaryBtn]}
                            onPress={() => setEditingPayment(false)}
                            activeOpacity={0.8}
                          >
                            <Text style={pf.secondaryBtnText}>Cancelar edición</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Section>
                  )}
                </>
              )}

              {/* 5. Action buttons */}
              <View style={styles.actions}>
                {apt.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.btnPrimary, acting && styles.btnDisabled]}
                      onPress={() => doAction('confirm')}
                      disabled={acting}
                      activeOpacity={0.85}
                    >
                      {acting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>Confirmar cita</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnOutline, acting && styles.btnDisabled]}
                      onPress={() => doAction('cancel')}
                      disabled={acting}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnOutlineText}>Cancelar cita</Text>
                    </TouchableOpacity>
                  </>
                )}

                {apt.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.btnOutline, acting && styles.btnDisabled]}
                    onPress={() => doAction('cancel')}
                    disabled={acting || registering}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnOutlineText}>Cancelar cita</Text>
                  </TouchableOpacity>
                )}
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        )
      })()}
    </SafeAreaView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '500', color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 12,
  },
  formCard: {
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
  sectionTitle: {
    fontSize: 13, fontWeight: '500', color: GRAY,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  dateText: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeText: { fontSize: 15, color: DARK },
  notesText: { fontSize: 15, color: DARK, lineHeight: 22 },
  actions: { gap: 10, marginTop: 8 },
  btnPrimary: {
    height: 52, backgroundColor: PRIMARY, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  btnOutline: {
    height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: DARK,
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { color: DARK, fontSize: 15, fontWeight: '500' },
  btnDisabled: { opacity: 0.55 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '500' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 },
  errorText: { fontSize: 15, color: GRAY, textAlign: 'center' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  skeletonWrap: { gap: 12 },
  skeletonLine: { height: 16, backgroundColor: '#F0EDE9', borderRadius: 6 },
})

// ─── payment form styles ──────────────────────────────────────────────────────

const pf = StyleSheet.create({
  label: {
    fontSize: 11, fontWeight: '600', color: GRAY,
    letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase',
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 24, color: PRIMARY, lineHeight: 40,
  },
  amountInput: {
    flex: 1, fontSize: 32, color: DARK, padding: 0,
    borderBottomWidth: 1.5, borderBottomColor: BORDER,
  },
  currencyRow: {
    flexDirection: 'row', gap: 8, marginBottom: 4,
  },
  currencyPill: {
    paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#EDE8E4',
  },
  currencyPillActive: { backgroundColor: PRIMARY },
  currencyPillText: { fontSize: 13, fontWeight: '600', color: '#666' },
  currencyPillTextActive: { color: '#fff' },
  methodGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  methodPill: {
    width: '47%', height: 44, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDE8E4',
  },
  methodPillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  methodPillText: { fontSize: 12, color: DARK, flexShrink: 1 },
  methodPillTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, height: 44,
  },
  switchLabel: { fontSize: 15, fontWeight: '500', color: DARK },
  switchHint: { fontSize: 12, color: '#AAAAAA', marginTop: 4, marginBottom: 4 },
  notesInput: {
    minHeight: 60, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 12, fontSize: 14, color: DARK, backgroundColor: SURFACE, marginBottom: 4,
  },
  primaryBtn: {
    height: 52, backgroundColor: PRIMARY, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  secondaryBtn: {
    height: 44, borderRadius: 22, borderWidth: 1, borderColor: DARK,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '500', color: DARK },
  btnDisabled: { opacity: 0.55 },
  noMethodsBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8F5', borderRadius: 10,
    borderWidth: 1, borderColor: '#F5D5C8',
    padding: 12, marginTop: 4,
  },
  noMethodsText: { flex: 1, fontSize: 13, color: GRAY, lineHeight: 19 },
})

// ─── payment summary styles ───────────────────────────────────────────────────

const ps = StyleSheet.create({
  card: {
    backgroundColor: '#EAF4EA', borderRadius: 16,
    borderWidth: 1, borderColor: '#C8E6C9', padding: 16, marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  registeredLabel: {
    fontSize: 11, fontWeight: '600', color: '#27AE60', letterSpacing: 1, textTransform: 'uppercase',
  },
  amount: { fontSize: 36, color: DARK, marginBottom: 4 },
  method: { fontSize: 13, color: '#666', marginBottom: 8 },
  statusRow: { marginBottom: 6 },
  paidText: { fontSize: 14, fontWeight: '500', color: '#27AE60' },
  pendingText: { fontSize: 14, fontWeight: '500', color: '#E67E22' },
  paidAt: { fontSize: 12, color: '#666', marginBottom: 6 },
  notes: { fontSize: 13, color: GRAY, fontStyle: 'italic', marginTop: 4 },
  editBtn: {
    marginTop: 12, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#27AE60',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '500', color: '#27AE60' },
})
