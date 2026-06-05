import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  getSettings, getAppointments, getPromotions,
  getLoyaltyProgram, getLoyaltyAccounts, createClient, toVenezuelaDate,
  type AppointmentItem, type PromotionItem, type LoyaltyProgram, type ClientItem,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, capitalize, formatTime } from '../../lib/utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayDateLabel(): string {
  return capitalize(
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date())
  )
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function PulseSkeleton({ height, mx = 20, mb = 14 }: { height: number; mx?: number; mb?: number }) {
  const op = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]))
    a.start(); return () => a.stop()
  }, [op])
  return (
    <Animated.View style={{
      opacity: op, height, borderRadius: 16,
      backgroundColor: '#F0EDE9',
      marginHorizontal: mx, marginBottom: mb,
    }} />
  )
}

// ─── add client modal ─────────────────────────────────────────────────────────

const CLIENT_TAGS = ['VIP', 'Nueva', 'Regular', 'Frecuente'] as const

function AddClientModal({
  visible, onClose, onCreated,
}: {
  visible: boolean; onClose: () => void; onCreated: (c: ClientItem) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function reset() {
    setName(''); setPhone(''); setEmail(''); setNotes(''); setSelectedTags([])
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('', 'El nombre es requerido'); return }
    if (!phone.trim()) { Alert.alert('', 'El teléfono es requerido'); return }
    setSaving(true)
    try {
      const client = await createClient({
        name: name.trim(), phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: selectedTags,
      })
      reset(); onCreated(client)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear la clienta')
    } finally { setSaving(false) }
  }

  const slide = useRef(new Animated.Value(500)).current
  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 0 : 500, duration: 280, useNativeDriver: true }).start()
    if (!visible) reset()
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[ms.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={ms.handle} />
          <Text style={ms.title}>Nueva clienta</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={ms.label}>Nombre completo *</Text>
            <TextInput style={ms.input} value={name} onChangeText={setName}
              placeholder="María García" placeholderTextColor="#AAAAAA" />

            <Text style={[ms.label, { marginTop: 14 }]}>Teléfono *</Text>
            <TextInput style={ms.input} value={phone} onChangeText={setPhone}
              placeholder="04141234567" placeholderTextColor="#AAAAAA" keyboardType="phone-pad" />

            <Text style={[ms.label, { marginTop: 14 }]}>
              Email <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TextInput style={ms.input} value={email} onChangeText={setEmail}
              placeholder="maria@email.com" placeholderTextColor="#AAAAAA"
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={[ms.label, { marginTop: 14 }]}>
              Notas <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TextInput
              style={[ms.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              value={notes} onChangeText={setNotes} multiline
              placeholder="Preferencias, alergias…" placeholderTextColor="#AAAAAA" />

            <Text style={[ms.label, { marginTop: 14 }]}>Etiquetas</Text>
            <View style={ms.tagsRow}>
              {CLIENT_TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[ms.tagChip, active && ms.tagChipActive]}
                    onPress={() =>
                      setSelectedTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )
                    }
                    activeOpacity={0.78}
                  >
                    <Text style={[ms.tagText, active && { color: '#fff' }]}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[ms.btnPrimary, { marginTop: 24, marginBottom: 8 }, saving && { opacity: 0.6 }]}
              onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
              <Text style={ms.btnPrimaryText}>{saving ? 'Creando…' : 'Crear clienta'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── mini appointment card ────────────────────────────────────────────────────

function MiniApptCard({ appt, onPress }: { appt: AppointmentItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.miniCard} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.miniTime, { fontFamily: MONO }]}>{formatTime(appt.startTime)}</Text>
      <Text style={styles.miniName} numberOfLines={1}>{appt.client?.name ?? '—'}</Text>
    </TouchableOpacity>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type QuickAction = {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userName, setUserName] = useState('')
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [promos, setPromos] = useState<PromotionItem[]>([])
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null)
  const [loyaltyStats, setLoyaltyStats] = useState({ clientsWithPoints: 0, totalPoints: 0 })
  const [showAddClient, setShowAddClient] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const todayStr = toVenezuelaDate(new Date())
      const [sData, appts, promoList, program, accounts] = await Promise.all([
        getSettings(),
        getAppointments(todayStr),
        getPromotions(),
        getLoyaltyProgram(),
        getLoyaltyAccounts(),
      ])
      setUserName(sData?.name?.split(' ')[0] ?? '')
      setAppointments(appts.filter(a => a.status !== 'cancelled'))
      setPromos(promoList.filter(p => !p.validUntil || new Date(p.validUntil) >= new Date()))
      setLoyaltyProgram(program)
      const withPts = accounts.filter(a => a.totalPoints > 0)
      setLoyaltyStats({
        clientsWithPoints: withPts.length,
        totalPoints: withPts.reduce((s, a) => s + a.totalPoints, 0),
      })
    } catch { /* show what loaded */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const sortedAppts = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  const now = new Date()
  const nextAppt = sortedAppts.find(a => new Date(a.startTime) >= now) ?? sortedAppts[0] ?? null
  const nextThree = sortedAppts.slice(0, 3)

  const quickActions: QuickAction[] = [
    {
      icon: 'add-circle-outline',
      label: 'Nueva Cita',
      onPress: () => router.push('/appointments/new' as Parameters<typeof router.push>[0]),
    },
    {
      icon: 'person-add-outline',
      label: 'Nueva Clienta',
      onPress: () => setShowAddClient(true),
    },
    {
      icon: 'pricetag-outline',
      label: 'Promociones',
      onPress: () => router.push('/promotions' as Parameters<typeof router.push>[0]),
    },
    {
      icon: 'bar-chart-outline',
      label: 'Estadísticas',
      onPress: () => router.push('/stats' as Parameters<typeof router.push>[0]),
    },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} onRefresh={onRefresh}
            tintColor={PRIMARY} colors={[PRIMARY]}
          />
        }
      >
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Buenos días, {userName || '…'}</Text>
          <Text style={styles.dateLabel}>{todayDateLabel()}</Text>
        </View>

        {/* ─── Hoy ─── */}
        {loading ? (
          <>
            <PulseSkeleton height={150} />
            <PulseSkeleton height={76} />
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoy</Text>

            <View style={styles.todayCard}>
              <View style={styles.todayTop}>
                <View>
                  <Text style={[styles.apptCount, { fontFamily: MONO }]}>
                    {appointments.length}
                  </Text>
                  <Text style={styles.apptCountLabel}>
                    cita{appointments.length !== 1 ? 's' : ''} hoy
                  </Text>
                </View>
                {appointments.length === 0 && (
                  <Text style={styles.freeDayText}>Día libre 🌿</Text>
                )}
              </View>

              {nextAppt && (
                <View style={styles.nextRow}>
                  <Ionicons name="time-outline" size={14} color={GRAY} />
                  <Text style={[styles.nextTime, { fontFamily: MONO }]}>
                    {formatTime(nextAppt.startTime)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextName} numberOfLines={1}>
                      {nextAppt.client?.name ?? '—'}
                    </Text>
                    <Text style={styles.nextService} numberOfLines={1}>
                      {nextAppt.service?.name ?? ''}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {nextThree.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.miniScroll}
              >
                {nextThree.map(a => (
                  <MiniApptCard
                    key={a.id}
                    appt={a}
                    onPress={() =>
                      router.push(`/appointments/${a.id}` as Parameters<typeof router.push>[0])
                    }
                  />
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.agendaBtn}
              onPress={() => router.push('/calendar' as Parameters<typeof router.push>[0])}
              activeOpacity={0.8}
            >
              <Text style={styles.agendaBtnText}>Ver agenda completa</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Acceso rápido ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceso rápido</Text>
          <View style={styles.quickGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickCard}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <Ionicons name={action.icon} size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Promociones activas ─── */}
        {!loading && promos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Promociones activas</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promoScroll}
            >
              {promos.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.promoCard}
                  onPress={() =>
                    router.push(`/promotions/${p.id}` as Parameters<typeof router.push>[0])
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.promoTitle} numberOfLines={1}>{p.title}</Text>
                  <Text style={[styles.promoDiscount, { fontFamily: MONO }]}>-{p.discount}%</Text>
                  <Text style={styles.promoDates}>
                    {shortDate(p.validFrom)} → {shortDate(p.validUntil)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Fidelidad ─── */}
        {!loading && loyaltyProgram?.isActive && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Programa de fidelidad</Text>
            <View style={styles.loyaltyCard}>
              <View style={styles.loyaltyStats}>
                <View style={styles.loyaltyStat}>
                  <Text style={[styles.loyaltyVal, { fontFamily: MONO }]}>
                    {loyaltyStats.clientsWithPoints}
                  </Text>
                  <Text style={styles.loyaltyLbl}>clientas con puntos</Text>
                </View>
                <View style={styles.loyaltyDiv} />
                <View style={styles.loyaltyStat}>
                  <Text style={[styles.loyaltyVal, { fontFamily: MONO }]}>
                    {loyaltyStats.totalPoints}
                  </Text>
                  <Text style={styles.loyaltyLbl}>puntos activos</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.loyaltyBtn}
                onPress={() =>
                  router.push('/settings/loyalty' as Parameters<typeof router.push>[0])
                }
                activeOpacity={0.8}
              >
                <Text style={styles.loyaltyBtnText}>Ver programa</Text>
                <Ionicons name="chevron-forward-outline" size={14} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <AddClientModal
        visible={showAddClient}
        onClose={() => setShowAddClient(false)}
        onCreated={() => setShowAddClient(false)}
      />
    </SafeAreaView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 16 },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, marginBottom: 12 },
  greeting: { fontFamily: SERIF, fontSize: 28, color: PRIMARY, marginBottom: 4 },
  dateLabel: { fontSize: 14, color: GRAY },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: GRAY, marginBottom: 10, paddingHorizontal: 20, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Hoy card
  todayCard: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18,
  },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  apptCount: { fontSize: 48, color: DARK, lineHeight: 52 },
  apptCountLabel: { fontSize: 13, color: GRAY, marginTop: -4 },
  freeDayText: { fontSize: 15, color: GRAY },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nextTime: { fontSize: 16, color: DARK, minWidth: 48 },
  nextName: { fontSize: 14, fontWeight: '500', color: DARK },
  nextService: { fontSize: 12, color: GRAY, marginTop: 1 },

  // Mini cards
  miniScroll: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  miniCard: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, minWidth: 110,
  },
  miniTime: { fontSize: 15, color: DARK, marginBottom: 2 },
  miniName: { fontSize: 12, color: GRAY },

  // Ver agenda btn
  agendaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginHorizontal: 20, marginTop: 12, alignSelf: 'flex-start',
    height: 36, paddingHorizontal: 14, borderRadius: 18,
    borderWidth: 1, borderColor: PRIMARY,
  },
  agendaBtnText: { fontSize: 13, fontWeight: '500', color: PRIMARY },

  // Quick actions grid
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10,
  },
  quickCard: {
    width: '47%', height: 80, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  quickLabel: { fontSize: 12, fontWeight: '500', color: DARK, textAlign: 'center' },

  // Promo cards
  promoScroll: { paddingHorizontal: 20, gap: 10 },
  promoCard: {
    width: 160, padding: 14, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
  },
  promoTitle: { fontSize: 13, fontWeight: '500', color: DARK, marginBottom: 6 },
  promoDiscount: { fontSize: 20, color: PRIMARY, marginBottom: 4 },
  promoDates: { fontSize: 11, color: GRAY },

  // Loyalty card
  loyaltyCard: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  loyaltyStats: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 14 },
  loyaltyStat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  loyaltyVal: { fontSize: 26, fontWeight: '500', color: DARK, marginBottom: 2 },
  loyaltyLbl: { fontSize: 11, color: GRAY, textAlign: 'center' },
  loyaltyDiv: { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 4 },
  loyaltyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 38, borderRadius: 19, borderWidth: 1, borderColor: PRIMARY, gap: 4,
  },
  loyaltyBtnText: { fontSize: 13, fontWeight: '500', color: PRIMARY },
})

// ─── modal styles ─────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 20 },
  label: { fontSize: 12, color: GRAY, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 16, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  tagChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tagText: { fontSize: 13, fontWeight: '500', color: DARK },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})
