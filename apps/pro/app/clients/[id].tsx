import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Linking, Modal, RefreshControl,
  KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import {
  getClientById, updateClient,
  getLoyaltyProgram, findLoyaltyAccountByClientId, redeemLoyaltyReward,
  type ClientItem, type AppointmentStatus, type LoyaltyProgram, type LoyaltyAccount,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, initials, formatShortDate, formatMoney } from '../../lib/utils'

// ─── status pill (mini) ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  confirmed: { bg: '#E8F5E9', text: '#2E7D32' },
  pending:   { bg: '#FFF8E1', text: '#8B6914' },
  cancelled: { bg: '#FDECEA', text: '#C62828' },
  completed: { bg: '#F5F5F5', text: '#757575' },
}
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada', completed: 'Completada',
}

function MiniPill({ status }: { status: AppointmentStatus }) {
  const { bg, text } = STATUS_COLORS[status]
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: text }]}>{STATUS_LABEL[status]}</Text>
    </View>
  )
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

function Skeleton() {
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])
  return (
    <Animated.View style={[styles.skeletonWrap, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      {[80, 55, 40].map((w, i) => (
        <View key={i} style={[styles.skeletonLine, { width: `${w}%`, marginTop: i === 0 ? 20 : 10 }]} />
      ))}
    </Animated.View>
  )
}

// ─── edit client modal ────────────────────────────────────────────────────────

const AVAILABLE_TAGS = ['VIP', 'Nueva', 'Regular', 'Frecuente']

function formatBirthday(iso: string): string {
  const parts = iso.split('-')
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
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const refMonth = useRef<TextInput>(null)
  const refYear = useRef<TextInput>(null)

  useEffect(() => {
    if (!visible) return
    setName(client.name)
    setPhone(client.phone)
    setEmail(client.email ?? '')
    setSelectedTags(client.tags ?? [])
    setNotes(client.notes ?? '')
    if (client.birthday) {
      const parts = client.birthday.split('-')
      setYear(parts[0] ?? '')
      setMonth(parts[1] ?? '')
      setDay(parts[2] ?? '')
    } else {
      setDay(''); setMonth(''); setYear('')
    }
  }, [visible, client])

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('', 'El nombre es requerido'); return }
    if (!phone.trim()) { Alert.alert('', 'El teléfono es requerido'); return }

    let birthday: string | null = null
    if (day && month && year && year.length === 4) {
      birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        birthday,
        tags: selectedTags,
        notes: notes.trim(),
      })
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.mSafe} edges={['top', 'bottom']}>
        <View style={styles.mHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.mCancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.mTitle}>Editar clienta</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.mSave, saving && { opacity: 0.5 }]}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.mContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
            <View style={styles.mBirthdayRow}>
              <View style={styles.mBirthdayField}>
                <Text style={styles.mBirthdayLabel}>DD</Text>
                <TextInput
                  style={styles.mBirthdayInput}
                  value={day}
                  onChangeText={v => {
                    const d = v.replace(/\D/g, '').slice(0, 2)
                    setDay(d)
                    if (d.length === 2) refMonth.current?.focus()
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="DD"
                  placeholderTextColor="#AAAAAA"
                  textAlign="center"
                />
              </View>
              <Text style={styles.mBirthdaySep}>/</Text>
              <View style={styles.mBirthdayField}>
                <Text style={styles.mBirthdayLabel}>MM</Text>
                <TextInput
                  ref={refMonth}
                  style={styles.mBirthdayInput}
                  value={month}
                  onChangeText={v => {
                    const m = v.replace(/\D/g, '').slice(0, 2)
                    setMonth(m)
                    if (m.length === 2) refYear.current?.focus()
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="MM"
                  placeholderTextColor="#AAAAAA"
                  textAlign="center"
                />
              </View>
              <Text style={styles.mBirthdaySep}>/</Text>
              <View style={[styles.mBirthdayField, { flex: 2 }]}>
                <Text style={styles.mBirthdayLabel}>AAAA</Text>
                <TextInput
                  ref={refYear}
                  style={styles.mBirthdayInput}
                  value={year}
                  onChangeText={v => setYear(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="AAAA"
                  placeholderTextColor="#AAAAAA"
                  textAlign="center"
                />
              </View>
            </View>

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
      </SafeAreaView>
    </Modal>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: ClientItem }

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [editModal, setEditModal] = useState(false)

  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null)
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setState({ kind: 'loading' })
    try {
      const [data, program, account] = await Promise.all([
        getClientById(id),
        getLoyaltyProgram(),
        findLoyaltyAccountByClientId(id),
      ])
      setState(data ? { kind: 'ok', data } : { kind: 'error' })
      setLoyaltyProgram(program)
      setLoyaltyAccount(account)
    } catch { setState({ kind: 'error' }) }
  }, [id])

  useEffect(() => { load() }, [load])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function saveClient(data: ClientUpdate) {
    if (!id) return
    try {
      await updateClient(id, data)
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios')
      return
    }
    setState(prev =>
      prev.kind === 'ok'
        ? { ...prev, data: { ...prev.data, ...data } }
        : prev
    )
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
            setRedeeming(true)
            try {
              const result = await redeemLoyaltyReward(loyaltyAccount.id)
              setLoyaltyAccount(prev => prev
                ? { ...prev, totalPoints: prev.totalPoints - result.pointsUsed }
                : prev
              )
              Alert.alert('', `¡Canje registrado! Se descontaron ${result.pointsUsed} puntos.`)
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Error al registrar el canje'
              Alert.alert('Error', msg)
            } finally { setRedeeming(false) }
          },
        },
      ]
    )
  }

  const title = state.kind === 'ok' ? state.data.name : 'Clienta'
  const showLoyalty = loyaltyProgram?.isActive === true

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
        <ScrollView contentContainerStyle={styles.content}><Skeleton /></ScrollView>
      )}

      {state.kind === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.grayText}>No se pudo cargar la ficha</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
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

              {/* Appointment history */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Historial de citas</Text>
                {!c.appointments || c.appointments.length === 0 ? (
                  <Text style={styles.grayText}>Sin citas anteriores registradas</Text>
                ) : (
                  c.appointments.map(apt => (
                    <View key={apt.id} style={styles.aptRow}>
                      <View style={styles.aptLeft}>
                        <Text style={styles.aptDate}>{formatShortDate(apt.startTime)}</Text>
                        <Text style={styles.aptService}>{apt.service?.name ?? '—'}</Text>
                      </View>
                      <View style={styles.aptRight}>
                        {apt.service?.price != null && (
                          <Text style={[styles.aptPrice, { fontFamily: MONO }]}>
                            {formatMoney(apt.service.price)}
                          </Text>
                        )}
                        <MiniPill status={apt.status} />
                      </View>
                    </View>
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
  notesText: { fontSize: 15, color: DARK, lineHeight: 22 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '500' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  // skeleton
  skeletonWrap: { alignItems: 'center', paddingTop: 16 },
  skeletonAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0EDE9' },
  skeletonLine: { height: 14, backgroundColor: '#F0EDE9', borderRadius: 6, alignSelf: 'stretch' },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  mCancel: { fontSize: 15, color: GRAY },
  mTitle: { fontSize: 17, fontWeight: '500', color: DARK },
  mSave: { fontSize: 15, fontWeight: '600', color: PRIMARY },
  mContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  mLabel: { fontSize: 12, color: GRAY, marginBottom: 6 },
  mInput: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  mBirthdayRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  mBirthdayField: { flex: 1 },
  mBirthdayLabel: { fontSize: 10, color: GRAY, marginBottom: 4, textAlign: 'center' },
  mBirthdayInput: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  mBirthdaySep: { fontSize: 20, color: GRAY, paddingBottom: 12 },
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
