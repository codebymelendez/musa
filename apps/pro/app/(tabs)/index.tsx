import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import {
  getSettings, getAppointments, getPromotions, getStats, getClients, getAppointmentsInRange,
  getLoyaltyProgram, getLoyaltyAccounts, createClient, toVenezuelaDate, normalizeISODate,
  type AppointmentItem, type PromotionItem, type LoyaltyProgram, type ClientItem,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, capitalize, formatTime, formatMoney } from '../../lib/utils'

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

function getGreeting(): string {
  const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' })).getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function isPromoActive(promo: PromotionItem): boolean {
  const now = new Date()
  if (!promo.validFrom && !promo.validUntil) return true
  const from = promo.validFrom ? new Date(normalizeISODate(promo.validFrom)) : null
  const until = promo.validUntil ? new Date(normalizeISODate(promo.validUntil)) : null
  if (from && now < from) return false
  if (until && now > until) return false
  return true
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [weeklyRevenue, setWeeklyRevenue] = useState<number | null>(null)
  const [monthlyRevenue, setMonthlyRevenue] = useState<number | null>(null)
  const [newClientsCount, setNewClientsCount] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const venezNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }))
      const year = venezNow.getFullYear()
      const month = venezNow.getMonth() + 1
      const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`
      const weekFrom = new Date(Date.now() - 7 * 86_400_000).toISOString()
      const weekTo = new Date().toISOString()
      const todayStr = toVenezuelaDate(new Date())

      const results = await Promise.allSettled([
        getSettings(),
        getAppointments(todayStr),
        getPromotions(),
        getLoyaltyProgram(),
        getLoyaltyAccounts(),
        getStats(year, month).catch(() => null),
        getClients().catch(() => [] as ClientItem[]),
        getAppointmentsInRange(weekFrom, weekTo).catch(() => [] as AppointmentItem[]),
      ])

      const sData = results[0].status === 'fulfilled' ? results[0].value as any : null
      const appts = results[1].status === 'fulfilled' ? results[1].value as any[] : []
      const promoList = results[2].status === 'fulfilled' ? results[2].value as any[] : []
      const program = results[3].status === 'fulfilled' ? results[3].value as any : null
      const accounts = results[4].status === 'fulfilled' ? results[4].value as any[] : []
      const statsData = results[5].status === 'fulfilled' ? results[5].value as any : null
      const clients = results[6].status === 'fulfilled' ? results[6].value as any[] : []
      const weekAppts = results[7].status === 'fulfilled' ? results[7].value as any[] : []

      setUserName(sData?.name?.split(' ')[0] ?? '')
      setAvatarUrl(sData?.avatarUrl ?? null)
      setAppointments(appts.filter((a: any) => a.status !== 'cancelled'))
      setPromos(promoList.filter(isPromoActive))
      setLoyaltyProgram(program)
      const withPts = accounts.filter((a: any) => a.totalPoints > 0)
      setLoyaltyStats({
        clientsWithPoints: withPts.length,
        totalPoints: withPts.reduce((s: number, a: any) => s + a.totalPoints, 0),
      })
      if (statsData) setMonthlyRevenue(statsData.monthlyRevenue)
      const wRev = weekAppts
        .filter((a: any) => a.status === 'completed')
        .reduce((sum: number, a: any) => sum + (a.payment?.isPaid ? a.payment.amount : a.service.price), 0)
      setWeeklyRevenue(wRev)
      setNewClientsCount(clients.filter((c: any) => (c.createdAt ?? '').slice(0, 10) >= firstDayStr).length)
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

  // Cobrado hoy — derived from today's appointments
  const cobradoUSD = appointments
    .filter(a => a.payment?.isPaid && a.payment.currency !== 'Bs')
    .reduce((s, a) => s + a.payment!.amount, 0)
  const cobradoBs = appointments
    .filter(a => a.payment?.isPaid && a.payment.currency === 'Bs')
    .reduce((s, a) => s + a.payment!.amount, 0)
  const completedSinCobro = appointments.filter(a => a.status === 'completed' && !a.payment).length

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
      {/* Top AppBar */}
      <View style={styles.topBar}>
        <Text style={styles.topLogo}>MUSA PRO</Text>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.topIconBtn}>
            <Ionicons name="notifications-outline" size={20} color={DARK} />
          </TouchableOpacity>
          <View style={styles.topAvatarWrap}>
            {avatarUrl ? (
              <Image style={styles.topAvatar} source={{ uri: avatarUrl }} />
            ) : (
              <View style={[styles.topAvatar, { backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 14, color: '#B5593E', fontWeight: '600' }}>
                  {userName ? userName[0].toUpperCase() : 'M'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

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
        {/* ─── Greeting & Profile ─── */}
        <View style={styles.greetingSection}>
          <Text style={styles.sublabel}>{getGreeting().toUpperCase()}</Text>
          <Text style={styles.greetingName}>{userName || 'Bienvenida'}</Text>
        </View>

        {/* ─── Bento Stats Grid ─── */}
        {loading ? (
          <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
            <PulseSkeleton height={120} mx={0} mb={0} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><PulseSkeleton height={110} mx={0} mb={0} /></View>
              <View style={{ flex: 1 }}><PulseSkeleton height={110} mx={0} mb={0} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><PulseSkeleton height={86} mx={0} mb={0} /></View>
              <View style={{ flex: 1 }}><PulseSkeleton height={86} mx={0} mb={0} /></View>
            </View>
          </View>
        ) : (
          <View style={styles.bentoContainer}>
            {/* Row 1: Citas hoy (full, dark) */}
            <View style={styles.apptsTodayCard}>
              <Text style={[styles.bentoLabel, { color: '#fff', opacity: 0.6 }]}>CITAS DE HOY</Text>
              <Text style={[styles.bentoValLarge, { fontFamily: MONO, color: '#fff' }]}>
                {appointments.length}
              </Text>
              {nextAppt ? (
                <Text style={[styles.bentoSubText, { color: '#fff', opacity: 0.7 }]}>
                  Siguiente a las {formatTime(nextAppt.startTime)}
                </Text>
              ) : (
                <Text style={[styles.bentoSubText, { color: '#fff', opacity: 0.7 }]}>Día libre 🌿</Text>
              )}
            </View>

            {/* Row 2: Cobrado hoy + Clientas nuevas */}
            <View style={styles.subStatsRow}>
              <TouchableOpacity
                style={styles.halfCard}
                onPress={() => router.push('/stats' as Parameters<typeof router.push>[0])}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.bentoLabel}>COBRADO HOY</Text>
                  <Ionicons name="cash-outline" size={13} color={PRIMARY} />
                </View>
                {cobradoUSD > 0 || cobradoBs > 0 ? (
                  <>
                    {cobradoUSD > 0 && (
                      <Text style={[styles.bentoVal, { fontFamily: MONO }]}>
                        {formatMoney(cobradoUSD)}
                      </Text>
                    )}
                    {cobradoBs > 0 && (
                      <Text style={[styles.bentoValSm, { fontFamily: MONO }]}>
                        {`Bs. ${cobradoBs.toFixed(0)}`}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={[styles.bentoVal, { fontFamily: MONO, color: GRAY }]}>$0</Text>
                )}
                {completedSinCobro > 0 && (
                  <View style={styles.cobrarBadge}>
                    <View style={styles.cobrarDot} />
                    <Text style={styles.cobrarBadgeText}>
                      {completedSinCobro} sin registrar
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.halfCard}>
                <Text style={styles.bentoLabel}>CLIENTAS NUEVAS</Text>
                <Text style={[styles.bentoVal, { fontFamily: MONO }]}>
                  {newClientsCount !== null ? String(newClientsCount) : '—'}
                </Text>
                <Text style={styles.bentoSubText}>Este mes</Text>
              </View>
            </View>

            {/* Row 3: Ingresos semana + Ingresos mes */}
            <View style={styles.subStatsRow}>
              <View style={[styles.halfCard, styles.halfCardCompact]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bentoLabel}>ING. SEMANA</Text>
                  <Ionicons name="trending-up-outline" size={13} color={PRIMARY} />
                </View>
                <Text style={[styles.bentoValSm, { fontFamily: MONO }]}>
                  {weeklyRevenue !== null ? formatMoney(weeklyRevenue) : '—'}
                </Text>
              </View>

              <View style={[styles.halfCard, styles.halfCardCompact, { backgroundColor: '#F5F0EB' }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bentoLabel}>ING. MES</Text>
                </View>
                <Text style={[styles.bentoValSm, { fontFamily: MONO }]}>
                  {monthlyRevenue !== null ? formatMoney(monthlyRevenue) : '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── Today's Agenda ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>AGENDA DE HOY</Text>
            <TouchableOpacity onPress={() => router.push('/calendar' as Parameters<typeof router.push>[0])}>
              <Text style={styles.viewAllBtn}>VER TODO</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingHorizontal: 20 }}><PulseSkeleton height={60} mx={0} mb={10} /></View>
          ) : appointments.length === 0 ? (
            <View style={styles.emptyAgenda}>
              <Text style={styles.emptyAgendaText}>La agenda está libre hoy. 🌿</Text>
            </View>
          ) : (
            <View style={styles.agendaList}>
              {sortedAppts.map(apt => {
                // border depending on status
                const isConfirmed = apt.status === 'confirmed'
                const isPending = apt.status === 'pending'
                const isCompleted = apt.status === 'completed'
                const leftColor = isConfirmed ? PRIMARY : isCompleted ? '#2D6A4F' : isPending ? '#D98B73' : '#6B2E1E'
                return (
                  <TouchableOpacity
                    key={apt.id}
                    style={[styles.agendaRow, { borderLeftColor: leftColor }]}
                    onPress={() => router.push(`/appointments/${apt.id}` as Parameters<typeof router.push>[0])}
                    activeOpacity={0.7}
                  >
                    <View style={styles.agendaTimeWrap}>
                      <Text style={[styles.agendaTime, { fontFamily: MONO }]}>{formatTime(apt.startTime)}</Text>
                    </View>
                    <View style={styles.agendaContent}>
                      <Text style={styles.agendaClient}>{apt.client?.name ?? '—'}</Text>
                      <Text style={styles.agendaService}>{apt.service?.name ?? ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={16} color={GRAY} />
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* ─── Promociones activas ─── */}
        {promos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>PROMOCIONES ACTIVAS</Text>
              <TouchableOpacity onPress={() => router.push('/promotions' as Parameters<typeof router.push>[0])}>
                <Text style={styles.viewAllBtn}>VER TODO</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoList}>
              {promos.map(promo => (
                <TouchableOpacity
                  key={promo.id}
                  style={styles.promoCard}
                  onPress={() => router.push(`/promotions/${promo.id}` as Parameters<typeof router.push>[0])}
                  activeOpacity={0.7}
                >
                  <View style={styles.promoContent}>
                    <Text style={styles.promoTitle} numberOfLines={1}>{promo.title}</Text>
                    {promo.description ? (
                      <Text style={styles.promoDesc} numberOfLines={1}>{promo.description}</Text>
                    ) : null}
                    {promo.validUntil ? (
                      <Text style={styles.promoDate}>
                        Válida hasta {shortDate(promo.validUntil)}
                      </Text>
                    ) : (
                      <Text style={styles.promoDate}>Sin fecha límite</Text>
                    )}
                  </View>
                  <View style={styles.promoDiscountBadge}>
                    <Text style={[styles.promoDiscountText, { fontFamily: MONO }]}>
                      -{promo.discount}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── Pro Insights Spotlight ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECOMENDACIONES DE NEGOCIO</Text>
          <View style={[styles.insightsCard, { backgroundColor: '#FDF0EC' }]}>
            <View style={styles.insightsOverlay}>
              <Text style={[styles.insightsTitle, { color: DARK }]}>Consejo MUSA</Text>
              <Text style={[styles.insightsDesc, { color: GRAY }]}>Comparte tu enlace de reserva con nuevas clientas y mantén tu agenda siempre actualizada.</Text>
              <TouchableOpacity
                style={styles.insightsBtn}
                onPress={() => router.push('/settings' as Parameters<typeof router.push>[0])}
                activeOpacity={0.8}
              >
                <Text style={styles.insightsBtnText}>VER MI ENLACE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Acceso rápido ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCESO RÁPIDO</Text>
          <View style={styles.quickGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickCard}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <Ionicons name={action.icon} size={22} color={PRIMARY} />
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/appointments/new' as Parameters<typeof router.push>[0])}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
  content: { paddingBottom: 100 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 64, backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  topLogo: { fontFamily: SERIF, fontSize: 22, fontWeight: 'normal', color: PRIMARY, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIconBtn: { padding: 4 },
  topAvatarWrap: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  topAvatar: { width: '100%', height: '100%' },

  greetingSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  sublabel: { fontSize: 11, fontWeight: '600', color: GRAY, letterSpacing: 1.5 },
  greetingName: { fontFamily: SERIF, fontSize: 32, color: DARK, marginTop: 4 },

  bentoContainer: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bentoLabel: { fontSize: 10, fontWeight: '600', color: GRAY, letterSpacing: 0.8 },
  bentoValLarge: { fontSize: 34, color: DARK, fontWeight: 'normal', marginTop: 12 },
  bentoSubText: { fontSize: 11, color: GRAY, marginTop: 4 },
  bentoVal: { fontSize: 24, color: DARK, fontWeight: 'normal', marginTop: 8 },
  bentoValSm: { fontSize: 18, color: DARK, fontWeight: 'normal', marginTop: 6 },

  apptsTodayCard: {
    backgroundColor: DARK, borderRadius: 16,
    padding: 18, height: 120, justifyContent: 'space-between',
  },
  subStatsRow: { flexDirection: 'row', gap: 10 },
  halfCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, height: 110, justifyContent: 'space-between',
  },
  halfCardCompact: { height: 86 },
  cobrarBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  cobrarDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E67E22' },
  cobrarBadgeText: { fontSize: 10, color: '#E67E22', fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: GRAY, letterSpacing: 0.8 },
  viewAllBtn: { fontSize: 11, fontWeight: '600', color: PRIMARY, letterSpacing: 0.5 },

  emptyAgenda: { marginHorizontal: 20, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  emptyAgendaText: { fontSize: 14, color: GRAY, fontStyle: 'italic' },

  agendaList: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  agendaRow: {
    flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: 16,
    borderLeftWidth: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  agendaTimeWrap: { width: 60 },
  agendaTime: { fontSize: 13, color: DARK },
  agendaContent: { flex: 1, gap: 2 },
  agendaClient: { fontSize: 14, fontWeight: '500', color: DARK },
  agendaService: { fontSize: 12, color: GRAY },

  insightsCard: { marginHorizontal: 20, height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EDE8E4' },
  insightsBg: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  insightsOverlay: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: 'space-between' },
  insightsTitle: { fontFamily: SERIF, fontSize: 18, color: DARK },
  insightsDesc: { fontSize: 13, color: GRAY, lineHeight: 18 },
  insightsBtn: { height: 40, borderWidth: 1, borderColor: DARK, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  insightsBtnText: { fontSize: 12, fontWeight: '600', color: DARK, letterSpacing: 0.5 },

  promoList: { marginHorizontal: 20, gap: 8 },
  promoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 12,
  },
  promoContent: { flex: 1, gap: 3 },
  promoTitle: { fontSize: 14, fontWeight: '500', color: DARK },
  promoDesc: { fontSize: 12, color: GRAY },
  promoDate: { fontSize: 11, color: GRAY, marginTop: 2 },
  promoDiscountBadge: {
    minWidth: 52, height: 40, borderRadius: 10,
    backgroundColor: '#FDF0EC', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
  promoDiscountText: { fontSize: 15, fontWeight: '600', color: PRIMARY },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  quickCard: {
    width: '48%', height: 74, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  quickLabel: { fontSize: 12, fontWeight: '500', color: DARK },

  fab: {
    position: 'absolute', bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
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
