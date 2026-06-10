import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Linking, Modal, RefreshControl,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import DatePickerModal, { formatDateSpanish } from '../../components/DatePickerModal'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import {
  type ClientItem, type AppointmentStatus, type AppointmentPayment, type LoyaltyProgram, type LoyaltyAccount,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, initials, formatShortDate, formatMoney, formatBs, isBs } from '../../lib/utils'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import { validate, clientFormSchema } from '../../lib/validation'
import {
  useClient, useUpdateClient, useLoyaltyProgram, useLoyaltyAccounts, useRedeemLoyaltyReward,
} from '../../hooks/queries'
import { MaxWidthContainer } from '../../components/ui/MaxWidthContainer'

// ─── status pill (mini) ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:    { bg: '#E8F5E9', text: '#2E7D32' },
  pending:      { bg: '#FFF8E1', text: '#8B6914' },
  cancelled:    { bg: '#FDECEA', text: '#C62828' },
  completed:    { bg: '#F5F5F5', text: '#757575' },
  no_show:      { bg: '#FFF3E0', text: '#E65100' },
  rescheduled:  { bg: '#E3F2FD', text: '#1565C0' },
  reprogrammed: { bg: '#E3F2FD', text: '#1565C0' },
}
const STATUS_LABEL: Record<string, string> = {
  confirmed:    'Confirmada',
  pending:      'Pendiente',
  cancelled:    'Cancelada',
  completed:    'Completada',
  no_show:      'No asistió',
  rescheduled:  'Reprogramada',
  reprogrammed: 'Reprogramada',
}

function MiniPill({ status }: { status: AppointmentStatus }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F5F5F5', text: '#757575' }
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.pillText, { color: colors.text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  )
}

const METHOD_LABEL: Record<string, string> = {
  efectivo_bs:  'Efectivo Bs.',
  efectivo_usd: 'Efectivo USD',
  pago_movil:   'Pago Móvil',
  zelle:        'Zelle',
  transferencia:'Transferencia',
  otro:         'Otro',
}

function paymentAmountStr(p: AppointmentPayment): string {
  return isBs(p.currency)
    ? formatBs(p.amount)
    : `$${p.amount.toFixed(2)}`
}

// ─── loyalty section ──────────────────────────────────────────────────────────

function LoyaltySection({
  program, account, onRedeem,
}: {
  program: LoyaltyProgram
  account: LoyaltyAccount | null
  onRedeem: () => void
}) {
  const totalPoints = account?.totalPoints ?? 0
  const threshold = program.rewardThreshold
  const progress = Math.min(1, totalPoints / threshold)
  const canRedeem = totalPoints >= threshold

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Fidelidad</Text>

      <View style={styles.loyaltyHero}>
        <View style={styles.loyaltyPointsBox}>
          <Text style={[styles.loyaltyPoints, { fontFamily: MONO }]}>{totalPoints}</Text>
          <Text style={styles.loyaltyPointsLabel}>puntos</Text>
        </View>
        {account?.lifetimePoints != null && account.lifetimePoints > 0 && (
          <View style={styles.loyaltyLifetime}>
            <Text style={styles.loyaltyLifetimeLabel}>Total histórico</Text>
            <Text style={[styles.loyaltyLifetimeValue, { fontFamily: MONO }]}>
              {account.lifetimePoints}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {canRedeem
            ? '¡Lista para canjear su premio!'
            : `${totalPoints} / ${threshold} puntos para el próximo premio`}
        </Text>
      </View>

      {program.rewardDescription ? (
        <View style={styles.rewardRow}>
          <Ionicons name="gift-outline" size={15} color={PRIMARY} />
          <Text style={styles.rewardText}>{program.rewardDescription}</Text>
        </View>
      ) : null}

      {canRedeem && account && (
        <TouchableOpacity style={styles.redeemBtn} onPress={onRedeem} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.redeemBtnText}>Registrar canje</Text>
        </TouchableOpacity>
      )}

      {!account && (
        <Text style={styles.noAccountHint}>Esta clienta aún no tiene puntos acumulados</Text>
      )}
    </View>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function ClientSkeleton() {
  return (
    <Pulse style={styles.skeletonWrap}>
      <Bone width={72} height={72} radius={36} />
      {[80, 55, 40].map((w, i) => (
        <Bone key={i} height={14} width={`${w}%`} style={{ marginTop: i === 0 ? 20 : 10 }} />
      ))}
    </Pulse>
  )
}

// ─── edit client modal ────────────────────────────────────────────────────────

const AVAILABLE_TAGS = ['VIP', 'Nueva', 'Regular', 'Frecuente']

function formatBirthday(iso: string): string {
  const clean = iso.split('T')[0]
  const parts = clean.split('-')
  if (parts.length < 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

type ClientUpdate = {
  name: string
  phone: string
  email: string | null
  birthday: string | null
  tags: string[]
  notes: string
}

function EditClientModal({
  visible, client, onClose, onSave,
}: {
  visible: boolean
  client: ClientItem
  onClose: () => void
  onSave: (data: ClientUpdate) => Promise<void>
}) {
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [birthday, setBirthday] = useState<string | null>(null)
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!visible) return
    setName(client.name)
    setPhone(client.phone)
    setEmail(client.email ?? '')
    setSelectedTags(client.tags ?? [])
    setNotes(client.notes ?? '')
    setBirthday(client.birthday ? client.birthday.split('T')[0] : null)
  }, [visible, client])

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    const parsed = validate(clientFormSchema, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      birthday: birthday ?? undefined,
      tags: selectedTags,
      notes: notes.trim() || undefined,
    })
    if (!parsed.ok) { Alert.alert('', parsed.error); return }

    setSaving(true)
    try {
      await onSave({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        birthday,
        tags: selectedTags,
        notes: notes.trim(),
      })
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.mSafe} edges={['top', 'bottom']}>
        <MaxWidthContainer>
          <View style={styles.mHeader}>
          <Text style={styles.mTitle}>Editar clienta</Text>
          <TouchableOpacity
            style={styles.mCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-outline" size={24} color={DARK} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={88}
        >
          <ScrollView
            contentContainerStyle={styles.mContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.mLabel}>Nombre completo *</Text>
            <TextInput
              style={styles.mInput}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#AAAAAA"
              returnKeyType="next"
            />

            <Text style={[styles.mLabel, { marginTop: 14 }]}>Teléfono *</Text>
            <TextInput
              style={styles.mInput}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#AAAAAA"
            />

            <Text style={[styles.mLabel, { marginTop: 14 }]}>
              Email <Text style={{ color: '#BBBBBB' }}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.mInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#AAAAAA"
            />

            <Text style={[styles.mLabel, { marginTop: 14 }]}>
              Cumpleaños <Text style={{ color: '#BBBBBB' }}>(opcional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowBirthdayPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={16} color={PRIMARY} />
              <Text style={[styles.dateBtnText, !birthday && { color: '#AAAAAA' }]} numberOfLines={1}>
                {birthday ? formatDateSpanish(birthday) : 'Seleccionar fecha'}
              </Text>
              {birthday && (
                <TouchableOpacity onPress={() => setBirthday(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle-outline" size={16} color={GRAY} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={[styles.mLabel, { marginTop: 14 }]}>Etiquetas</Text>
            <View style={styles.mTagsRow}>
              {AVAILABLE_TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.mChip, active && styles.mChipActive]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.78}
                  >
                    <Text style={[styles.mChipText, active && styles.mChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[styles.mLabel, { marginTop: 14 }]}>
              Notas <Text style={{ color: '#BBBBBB' }}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.mNotesInput}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Alergias, preferencias, etc."
              placeholderTextColor="#AAAAAA"
              textAlignVertical="top"
            />

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Botones de acción al fondo */}
        <View style={[styles.mActions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.mCancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.mCancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mSaveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.mSaveBtnText}>{saving ? 'Guardando…' : 'Aceptar'}</Text>
          </TouchableOpacity>
        </View>
        </MaxWidthContainer>
      </SafeAreaView>

      <DatePickerModal
        visible={showBirthdayPicker}
        value={birthday}
        onConfirm={date => { setBirthday(date); setShowBirthdayPicker(false) }}
        onCancel={() => setShowBirthdayPicker(false)}
        title="Fecha de nacimiento"
        minDate="1940-01-01"
        maxDate={today}
      />
    </Modal>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: ClientItem }

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [editModal, setEditModal] = useState(false)

  const clientQuery = useClient(id)
  const loyaltyProgramQuery = useLoyaltyProgram()
  const loyaltyAccountsQuery = useLoyaltyAccounts()
  const updateClientMutation = useUpdateClient(id ?? '')
  const redeemMutation = useRedeemLoyaltyReward()

  const state: State = clientQuery.data
    ? { kind: 'ok', data: clientQuery.data }
    : clientQuery.isError || clientQuery.data === null
      ? { kind: 'error' }
      : { kind: 'loading' }

  const loyaltyProgram: LoyaltyProgram | null = loyaltyProgramQuery.data ?? null
  const loyaltyAccount: LoyaltyAccount | null =
    (loyaltyAccountsQuery.data ?? []).find(a => a.clientId === id) ?? null

  const refreshing = clientQuery.isRefetching
  const load = () => { clientQuery.refetch() }
  const onRefresh = () => {
    clientQuery.refetch()
    loyaltyProgramQuery.refetch()
    loyaltyAccountsQuery.refetch()
  }

  async function saveClient(data: ClientUpdate) {
    if (!id) return
    try {
      await updateClientMutation.mutateAsync(data)
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios')
      return
    }
    setEditModal(false)
  }

  function handleRedeem() {
    if (!loyaltyAccount || !loyaltyProgram) return
    Alert.alert(
      'Registrar canje',
      `¿Confirmas el canje de ${loyaltyProgram.rewardThreshold} puntos por "${loyaltyProgram.rewardDescription}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar canje',
          onPress: async () => {
            try {
              const result = await redeemMutation.mutateAsync(loyaltyAccount.id)
              Alert.alert('', `¡Canje registrado! Se descontaron ${result.pointsUsed} puntos.`)
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Error al registrar el canje'
              Alert.alert('Error', msg)
            }
          },
        },
      ]
    )
  }

  const title = state.kind === 'ok' ? state.data.name : 'Clienta'
  const showLoyalty = loyaltyProgram?.isActive === true

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MaxWidthContainer>
        <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setEditModal(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={state.kind !== 'ok'}
        >
          <Ionicons name="pencil-outline" size={20} color={state.kind === 'ok' ? PRIMARY : GRAY} />
        </TouchableOpacity>
      </View>

      {state.kind === 'loading' && (
        <ScrollView contentContainerStyle={styles.content}><ClientSkeleton /></ScrollView>
      )}

      {state.kind === 'error' && (
        <ErrorState message="No se pudo cargar la ficha" onRetry={load} />
      )}

      {state.kind === 'ok' && (() => {
        const c = state.data
        return (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
            >
              {/* Hero */}
              <View style={styles.heroSection}>
                <View style={styles.avatarLg}>
                  <Text style={styles.avatarLgText}>{initials(c.name)}</Text>
                </View>
                <Text style={styles.heroName}>{c.name}</Text>
                <TouchableOpacity
                  style={styles.phoneRow}
                  onPress={() => Linking.openURL(`tel:${c.phone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={16} color={PRIMARY} />
                  <Text style={styles.phoneText}>{c.phone}</Text>
                </TouchableOpacity>
                {c.birthday ? (
                  <View style={styles.birthdayRow}>
                    <Ionicons name="gift-outline" size={14} color={GRAY} />
                    <Text style={styles.birthdayText}>{formatBirthday(c.birthday)}</Text>
                  </View>
                ) : null}
                {c.tags && c.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {c.tags.map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {showLoyalty && loyaltyProgram && (
                <LoyaltySection
                  program={loyaltyProgram}
                  account={loyaltyAccount}
                  onRedeem={handleRedeem}
                />
              )}

              {/* Total cobrado summary card */}
              {c.appointments && c.appointments.length > 0 && (() => {
                const paid = c.appointments.filter(a => a.payment?.isPaid)
                const pending = c.appointments.filter(a => a.payment && !a.payment.isPaid)
                const totalUSD = paid
                  .filter(a => !isBs(a.payment!.currency))
                  .reduce((s, a) => s + a.payment!.amount, 0)
                const totalBs = paid
                  .filter(a => isBs(a.payment!.currency))
                  .reduce((s, a) => s + a.payment!.amount, 0)
                const hasCobros = paid.length > 0 || pending.length > 0
                if (!hasCobros) return null
                return (
                  <View style={styles.cobroCard}>
                    <Text style={styles.cobroLabel}>TOTAL COBRADO</Text>
                    <View style={styles.cobroAmounts}>
                      {totalUSD > 0 && (
                        <Text style={[styles.cobroAmount, { fontFamily: MONO }]}>
                          ${totalUSD.toFixed(2)} USD
                        </Text>
                      )}
                      {totalBs > 0 && (
                        <Text style={[styles.cobroAmount, { fontFamily: MONO }]}>
                          {formatBs(totalBs)}
                        </Text>
                      )}
                      {paid.length === 0 && (
                        <Text style={[styles.cobroAmount, { fontFamily: MONO }]}>$0.00</Text>
                      )}
                    </View>
                    {pending.length > 0 && (
                      <View style={styles.cobroPendingRow}>
                        <View style={styles.cobroPendingDot} />
                        <Text style={styles.cobroPendingText}>
                          {pending.length} cobro{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              })()}

              {/* Appointment history */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Historial de citas</Text>
                {!c.appointments || c.appointments.length === 0 ? (
                  <Text style={styles.grayText}>Sin citas anteriores registradas</Text>
                ) : (
                  c.appointments.map(apt => (
                    <TouchableOpacity
                      key={apt.id}
                      style={styles.aptRow}
                      onPress={() => router.push(`/appointments/${apt.id}` as any)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.aptLeft}>
                        <Text style={styles.aptDate}>{formatShortDate(apt.startTime)}</Text>
                        <Text style={styles.aptService}>{apt.service?.name ?? '—'}</Text>
                        {apt.payment && (
                          <View style={styles.aptPaymentRow}>
                            <Text style={[styles.aptPaymentAmount, { fontFamily: MONO }]}>
                              {paymentAmountStr(apt.payment)}
                            </Text>
                            <Text style={styles.aptPaymentMethod}>
                              {METHOD_LABEL[apt.payment.method] ?? apt.payment.method}
                            </Text>
                            {!apt.payment.isPaid && (
                              <View style={styles.aptPendingBadge}>
                                <Text style={styles.aptPendingText}>pendiente</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      <View style={styles.aptRight}>
                        <MiniPill status={apt.status} />
                        <Ionicons name="chevron-forward-outline" size={14} color={BORDER} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Notes */}
              {c.notes ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Notas</Text>
                  <Text style={styles.notesText}>{c.notes}</Text>
                </View>
              ) : null}
            </ScrollView>

            <EditClientModal
              visible={editModal}
              client={c}
              onClose={() => setEditModal(false)}
              onSave={saveClient}
            />
          </>
        )
      })()}
      </MaxWidthContainer>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '500', color: DARK, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 32 },
  avatarLg: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarLgText: { fontSize: 26, fontWeight: '500', color: PRIMARY },
  heroName: { fontFamily: SERIF, fontSize: 24, color: DARK, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  phoneText: { fontSize: 15, color: PRIMARY },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  birthdayText: { fontSize: 13, color: GRAY },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: { backgroundColor: '#EDE8E4', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, color: DARK },
  sectionBlock: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  aptRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  aptLeft: { flex: 1 },
  aptDate: { fontSize: 13, fontWeight: '500', color: DARK },
  aptService: { fontSize: 13, color: GRAY, marginTop: 2 },
  aptRight: { alignItems: 'flex-end', gap: 4 },
  aptPrice: { fontSize: 13, color: DARK },
  aptPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  aptPaymentAmount: { fontSize: 13, color: PRIMARY },
  aptPaymentMethod: { fontSize: 11, color: GRAY },
  aptPendingBadge: {
    backgroundColor: '#FFF3E0', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  aptPendingText: { fontSize: 10, color: '#E67E22', fontWeight: '500' },
  cobroCard: {
    backgroundColor: '#EAF4EA', borderRadius: 16,
    borderWidth: 1, borderColor: '#C8E6C9',
    padding: 16, marginBottom: 14,
  },
  cobroLabel: {
    fontSize: 11, fontWeight: '600', color: '#27AE60',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  cobroAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  cobroAmount: { fontSize: 22, color: DARK },
  cobroPendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cobroPendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E67E22' },
  cobroPendingText: { fontSize: 12, color: '#E67E22' },
  notesText: { fontSize: 15, color: DARK, lineHeight: 22 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '500' },
  // skeleton
  skeletonWrap: { alignItems: 'center', paddingTop: 16 },
  // loyalty
  loyaltyHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  loyaltyPointsBox: { alignItems: 'flex-start' },
  loyaltyPoints: { fontSize: 40, fontWeight: '500', color: PRIMARY, lineHeight: 44 },
  loyaltyPointsLabel: { fontSize: 12, color: GRAY, marginTop: 2 },
  loyaltyLifetime: { alignItems: 'flex-end' },
  loyaltyLifetimeLabel: { fontSize: 11, color: GRAY },
  loyaltyLifetimeValue: { fontSize: 18, fontWeight: '500', color: DARK },
  progressSection: { marginBottom: 14 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#EDE8E4', overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: GRAY },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  rewardText: { flex: 1, fontSize: 14, color: DARK },
  redeemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, backgroundColor: PRIMARY, borderRadius: 24,
  },
  redeemBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  noAccountHint: { fontSize: 13, color: '#BBBBBB', fontStyle: 'italic' },
  // edit modal (full-screen)
  mSafe: { flex: 1, backgroundColor: SURFACE },
  mHeader: {
    alignItems: 'center', justifyContent: 'center',
    height: 56, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  mTitle: { fontSize: 17, fontWeight: '500', color: DARK },
  mCloseBtn: {
    position: 'absolute', right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5F0EB', alignItems: 'center', justifyContent: 'center',
  },
  mActions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    backgroundColor: '#fff',
  },
  mCancelBtn: {
    flex: 1, height: 52, borderRadius: 26,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  mCancelBtnText: { fontSize: 15, fontWeight: '500', color: DARK },
  mSaveBtn: {
    flex: 1, height: 52, borderRadius: 26,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  mSaveBtnText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  mContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  mLabel: { fontSize: 12, color: GRAY, marginBottom: 6 },
  mInput: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, backgroundColor: SURFACE,
  },
  dateBtnText: { flex: 1, fontSize: 15, color: DARK },
  mTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE,
  },
  mChipActive: { borderColor: PRIMARY, backgroundColor: '#FDF0EC' },
  mChipText: { fontSize: 13, fontWeight: '500', color: GRAY },
  mChipTextActive: { color: PRIMARY },
  mNotesInput: {
    minHeight: 100, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, fontSize: 15, color: DARK,
  },
})
