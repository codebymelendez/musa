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
            {/* ─── Hero ─── */}
            <View style={styles.hero}>
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
              <Text style={styles.businessName}>{businessName || 'Mi Negocio'}</Text>

              {slug ? (
                <View style={styles.slugRow}>
                  <Text style={[styles.slugText, { fontFamily: MONO }]} numberOfLines={1}>
                    getmusa.app/p/{slug}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopy}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={copied ? 'checkmark-outline' : 'copy-outline'}
                      size={16}
                      color={copied ? '#2E7D32' : PRIMARY}
                    />
                    <Text style={[styles.copyBtnText, copied && { color: '#2E7D32' }]}>
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* ─── Navigation rows ─── */}
            <View style={styles.card}>
              <NavRow
                icon="cut-outline"
                label="Servicios"
                subtitle={`${serviceCount} servicio${serviceCount !== 1 ? 's' : ''}`}
                onPress={() => router.push('/services' as Parameters<typeof router.push>[0])}
              />
              <View style={styles.rowDivider} />
              <NavRow
                icon="pricetag-outline"
                label="Promociones"
                subtitle={`${activePromoCount} activa${activePromoCount !== 1 ? 's' : ''}`}
                onPress={() => router.push('/promotions' as Parameters<typeof router.push>[0])}
              />
              <View style={styles.rowDivider} />
              <NavRow
                icon="gift-outline"
                label="Programa de fidelidad"
                subtitle={loyaltySubtitle()}
                onPress={() => router.push('/settings/loyalty' as Parameters<typeof router.push>[0])}
              />
              <View style={styles.rowDivider} />
              <NavRow
                icon={isTeamPlan ? 'people-outline' : 'lock-closed-outline'}
                label="Mi Equipo"
                subtitle={teamSubtitle()}
                onPress={() => router.push('/team' as Parameters<typeof router.push>[0])}
                locked={!isTeamPlan}
              />
              <View style={styles.rowDivider} />
              <NavRow
                icon="bar-chart-outline"
                label="Estadísticas"
                onPress={() => router.push('/stats' as Parameters<typeof router.push>[0])}
              />
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
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
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: { fontSize: 32, fontWeight: '500', color: PRIMARY },
  businessName: { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 10 },
  slugRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slugText: { fontSize: 12, color: GRAY, flexShrink: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyBtnText: { fontSize: 13, fontWeight: '500', color: PRIMARY },

  card: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    height: 64, paddingHorizontal: 18,
  },
  rowIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FDF0EC', alignItems: 'center', justifyContent: 'center',
  },
  rowIconWrapLocked: { backgroundColor: '#F5F5F5' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: DARK },
  rowSub: { fontSize: 12, color: GRAY, marginTop: 1 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 },
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
