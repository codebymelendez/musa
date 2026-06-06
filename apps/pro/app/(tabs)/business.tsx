import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Animated, RefreshControl,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  getSettings, getServices, getPromotions, getLoyaltyProgram,
  type LoyaltyProgram,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF } from '../../lib/utils'

const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app').replace(/\/$/, '')

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  const op = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]))
    a.start(); return () => a.stop()
  }, [op])
  return (
    <Animated.View style={{ opacity: op }}>
      <View style={skStyles.heroSkeleton}>
        <View style={skStyles.avatarSkeleton} />
        <View style={[skStyles.lineSkeleton, { width: 160, height: 20, marginTop: 14 }]} />
        <View style={[skStyles.lineSkeleton, { width: 200, height: 14, marginTop: 8 }]} />
      </View>
      <View style={skStyles.cardSkeleton}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={[skStyles.rowSkeleton, i < 4 && skStyles.rowDivider]}>
            <View style={skStyles.iconSkeleton} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[skStyles.lineSkeleton, { width: '45%', height: 13 }]} />
              <View style={[skStyles.lineSkeleton, { width: '28%', height: 10 }]} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  )
}

// ─── nav row ──────────────────────────────────────────────────────────────────

function NavRow({
  icon, label, subtitle, onPress, locked = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  subtitle?: string
  onPress: () => void
  locked?: boolean
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.rowIconWrap, locked && styles.rowIconWrapLocked]}>
        <Ionicons name={icon} size={20} color={locked ? '#AAAAAA' : PRIMARY} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, locked && { color: GRAY }]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward-outline" size={16} color="#CCCCCC" />
    </TouchableOpacity>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function BusinessScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [planName, setPlanName] = useState<string | null>(null)
  const [teamCount, setTeamCount] = useState(0)
  const [serviceCount, setServiceCount] = useState(0)
  const [activePromoCount, setActivePromoCount] = useState(0)
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null)
  const [copied, setCopied] = useState(false)
  const [city, setCity] = useState('')

  const isTeamPlan = planName?.toLowerCase() === 'team'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sData, services, promos, program] = await Promise.all([
        getSettings(),
        getServices(),
        getPromotions(),
        getLoyaltyProgram(),
      ])
      setBusinessName(sData?.business?.name ?? '')
      setLogoUrl(sData?.business?.logoUrl ?? null)
      setSlug(sData?.slug ?? '')
      setPlanName(sData?.business?.plan?.name ?? null)
      setTeamCount(sData?.business?.users?.length ?? 0)
      setServiceCount(services.length)
      setCity(sData?.business?.city ?? 'Caracas')
      const now = new Date()
      setActivePromoCount(
        promos.filter(p => !p.validUntil || new Date(p.validUntil) >= now).length
      )
      setLoyaltyProgram(program)
    } catch { /* show what loaded */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function handleCopy() {
    await Clipboard.setStringAsync(`${APP_URL}/p/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function loyaltySubtitle(): string {
    if (!loyaltyProgram) return 'Inactivo'
    if (loyaltyProgram.isActive) return `Activo · ${loyaltyProgram.rewardThreshold} pts para premio`
    return 'Inactivo'
  }

  function teamSubtitle(): string {
    if (!isTeamPlan) return 'Plan Team requerido'
    return teamCount > 1 ? `${teamCount} miembros` : 'Solo tú'
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Negocio</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >
        {loading ? (
          <Skeleton />
        ) : (
          <>
            {/* ─── Hero / Profile Details ─── */}
            <View style={styles.hero}>
              <View style={styles.avatarContainer}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.avatarCircle} />
                ) : (
                  <View style={styles.avatarCircle}>
                    {businessName ? (
                      <Text style={styles.avatarLetter}>{businessName[0]?.toUpperCase()}</Text>
                    ) : (
                      <Ionicons name="business-outline" size={36} color={GRAY} />
                    )}
                  </View>
                )}
                <TouchableOpacity style={styles.avatarEditBtn}>
                  <Ionicons name="pencil-outline" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.businessName}>{businessName || 'Mi Negocio'}</Text>
              
              {/* Location and verified artist */}
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={GRAY} />
                <Text style={styles.locationText}>{city || 'Caracas, Venezuela'}</Text>
                <Text style={styles.dividerPipe}>|</Text>
                <Text style={styles.verifiedBadge}>Artista Verificado</Text>
              </View>
            </View>

            {/* ─── Services Bento Card ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Text style={styles.bentoLabel}>SERVICIOS</Text>
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="add-circle-outline" size={16} color={PRIMARY} />
                  <Text style={styles.addBtnText}>Agregar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.servicesList}>
                <View style={styles.serviceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Maquillaje de Novia Premium</Text>
                    <Text style={styles.serviceMeta}>90 min • Aerógrafo completo y pestañas incluidas</Text>
                  </View>
                  <Text style={[styles.servicePrice, { fontFamily: MONO }]}>$250</Text>
                </View>
                <View style={styles.serviceDivider} />
                <View style={styles.serviceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Preparación de Piel & Glow Editorial</Text>
                    <Text style={styles.serviceMeta}>45 min • Hidratación profunda y drenaje linfático</Text>
                  </View>
                  <Text style={[styles.servicePrice, { fontFamily: MONO }]}>$120</Text>
                </View>
                <View style={styles.serviceDivider} />
                <View style={styles.serviceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Clase Magistral Privada</Text>
                    <Text style={styles.serviceMeta}>180 min • Técnicas personalizadas 1 a 1</Text>
                  </View>
                  <Text style={[styles.servicePrice, { fontFamily: MONO }]}>$450</Text>
                </View>
              </View>
            </View>

            {/* ─── Portfolio Gallery ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Text style={styles.bentoLabel}>GALERÍA</Text>
                <TouchableOpacity>
                  <Text style={styles.manageAllText}>Gestionar todo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.galleryGrid}>
                <Image
                  style={styles.galleryImage}
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAEvuwzunP6L7SK2Eeq89p0MAjeLg_lWFyibOJQjSYLCM5qWQDqK5ZsHmHZcc834f1Gq5KZ_0M8LNtsWfbqvVgAXDad4G42sj6lOuUoI4zwxFG4msOLiVHL8tOWmnBls8ksYPK-wYZMG1R2KBpzKOTdAnsfLwIXfqmqqm_12KfW1Zw_iqJt8txcjDLLkAXAG0jb-EX07DXsMhbtJm4UxS_ssMxMGpYQPabBXh2jBAtAgIe6NysAdoC5cD4OMrPZwu8eSDpmj1ppLS_' }}
                />
                <Image
                  style={styles.galleryImage}
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdA5smSOMwOaZOS5NaO0VysyD_rHfWev5UBL4ryqo6cJfC0A8q-HalNr7l8L5EQQ2kE8nUnN9Hljd31aX6GJbMg8sl8vqaZIFS1kY1W85Mj8-fe7zx0tB2h0TOokq4ZgGu4UNMexQyCxjDrP2Wsek2MTk8CvGY1UMOOAkUMTIVbMVOeBf2lNNtEClxbd95rk2gmCMZj9orxs5wmneYxJlWuaCddRGzYoeVXrAFfqRkE1W4XS_YGZrvASz1QQOkrT1hvZ2mrFBCWrEW' }}
                />
                <Image
                  style={styles.galleryImage}
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ7SM3JqG_QvUokR1FnfVIP20PNY9nJTHZG6fVGpBBKtreexEHi3H3O10q9DKzHFUgoCpFkSCjs3VaDuQrTyoCFLpXvRDOZieM_w4m82EW7Dd4ucWaITYUQ_0cE___Cs6lXVxQpMuP0b_rHgtYvsY2kpm0u_VOSpPNun5fHLcTpH_aoemwSM9ptagju8ldE5LkwjTzABw5IsCemPdsUfybRc3O-z2foQ_WZBl9nnpbdiHDme3EIwz2067ZypVhLSeBId5cyvE5IdRJ' }}
                />
              </View>
            </View>

            {/* ─── Business Navigation Settings Rows ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AJUSTES DE NEGOCIO</Text>
              <View style={styles.card}>
                <NavRow
                  icon="calendar-outline"
                  label="Disponibilidad"
                  onPress={() => router.push('/settings/availability' as Parameters<typeof router.push>[0])}
                />
                <View style={styles.rowDivider} />
                <NavRow
                  icon="notifications-outline"
                  label="Notificaciones"
                  onPress={() => {}}
                />
                <View style={styles.rowDivider} />
                <NavRow
                  icon="card-outline"
                  label="Métodos de pago"
                  onPress={() => {}}
                />
              </View>
            </View>

            {/* ─── Online Booking Toggle Card ─── */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Reserva Online</Text>
                <View style={styles.fakeToggleActive}>
                  <View style={styles.fakeToggleCircleActive} />
                </View>
              </View>
              <Text style={styles.toggleDesc}>Las clientas pueden reservar servicios directamente desde tu perfil público de MUSA.</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: SERIF, fontSize: 28, color: DARK },
  content: { paddingTop: 20, paddingBottom: 16 },

  hero: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
  avatarContainer: { position: 'relative' },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
  },
  avatarLetter: { fontSize: 36, fontWeight: '500', color: PRIMARY },
  avatarEditBtn: {
    position: 'absolute', bottom: 12, right: 0,
    backgroundColor: PRIMARY, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: SURFACE,
  },
  businessName: { fontFamily: SERIF, fontSize: 24, color: DARK, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 13, color: GRAY },
  dividerPipe: { color: BORDER, fontSize: 13 },
  verifiedBadge: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  sectionCard: {
    marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 20,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  bentoLabel: { fontSize: 10, fontWeight: '600', color: GRAY, letterSpacing: 0.8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: PRIMARY },
  
  servicesList: { gap: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceTitle: { fontSize: 14, fontWeight: '500', color: DARK },
  serviceMeta: { fontSize: 12, color: GRAY, marginTop: 2 },
  servicePrice: { fontSize: 15, fontWeight: '600', color: PRIMARY },
  serviceDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER },

  manageAllText: { fontSize: 12, fontWeight: '600', color: GRAY },
  galleryGrid: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  galleryImage: { width: '31%', aspectRatio: 1, borderRadius: 8, backgroundColor: BORDER },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '600', color: GRAY, marginBottom: 8, paddingHorizontal: 20, letterSpacing: 0.8 },
  card: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    height: 56, paddingHorizontal: 18,
  },
  rowIconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#FDF0EC', alignItems: 'center', justifyContent: 'center',
  },
  rowIconWrapLocked: { backgroundColor: '#F5F5F5' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: DARK },
  rowSub: { fontSize: 11, color: GRAY, marginTop: 1 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 },

  toggleCard: {
    marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 20,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: DARK },
  fakeToggleActive: { width: 36, height: 20, borderRadius: 10, backgroundColor: PRIMARY, padding: 2, justifyContent: 'center', alignItems: 'flex-end' },
  fakeToggleCircleActive: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleDesc: { fontSize: 12, color: GRAY, lineHeight: 16 },
})

const skStyles = StyleSheet.create({
  heroSkeleton: { alignItems: 'center', paddingTop: 4, marginBottom: 24 },
  avatarSkeleton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0EDE9' },
  cardSkeleton: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  rowSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 64, paddingHorizontal: 18 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 },
  iconSkeleton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0EDE9' },
  lineSkeleton: { backgroundColor: '#F0EDE9', borderRadius: 6 },
})
