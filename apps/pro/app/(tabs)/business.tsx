import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF, initials } from '../../lib/utils'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import { useSettings, useServices, usePromotions, useLoyaltyProgram } from '../../hooks/queries'

const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app').replace(/\/$/, '')

// ─── skeleton ─────────────────────────────────────────────────────────────────

function BusinessSkeleton() {
  return (
    <Pulse>
      <View style={skStyles.heroSkeleton}>
        <Bone width={80} height={80} radius={40} />
        <Bone width={160} height={20} style={{ marginTop: 14 }} />
        <Bone width={200} height={14} style={{ marginTop: 8 }} />
      </View>
      <View style={skStyles.cardSkeleton}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={[skStyles.rowSkeleton, i < 4 && skStyles.rowDivider]}>
            <Bone width={38} height={38} radius={10} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone width="45%" height={13} />
              <Bone width="28%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </Pulse>
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
    <TouchableOpacity
      style={styles.row}
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.72}
    >
      <View style={[styles.rowIconWrap, locked && styles.rowIconWrapLocked]}>
        <Ionicons name={icon} size={20} color={locked ? '#AAAAAA' : PRIMARY} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, locked && { color: GRAY }]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons
        name={locked ? 'lock-closed-outline' : 'chevron-forward-outline'}
        size={16}
        color="#CCCCCC"
      />
    </TouchableOpacity>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function BusinessScreen() {
  const settingsQuery = useSettings()
  const servicesQuery = useServices()
  const promotionsQuery = usePromotions()
  const loyaltyQuery = useLoyaltyProgram()

  const [copied, setCopied] = useState(false)

  const sData = settingsQuery.data ?? null
  const businessName = sData?.business?.name ?? ''
  const avatarUrl = sData?.avatarUrl ?? null
  const slug = sData?.slug ?? ''
  const planName = sData?.business?.plan?.name ?? null
  const teamCount = sData?.business?.users?.length ?? 0
  const city = sData?.business?.city ?? 'Caracas'
  const serviceCount = servicesQuery.data?.length ?? 0
  const now = new Date()
  const activePromoCount = (promotionsQuery.data ?? [])
    .filter(p => !p.validUntil || new Date(p.validUntil) >= now).length
  const loyaltyProgram = loyaltyQuery.data ?? null

  const isTeamPlan = planName?.toLowerCase() === 'team'

  const loading = settingsQuery.isLoading && !sData
  const loadError = settingsQuery.isError && !sData
  const refreshing = settingsQuery.isRefetching
  const onRefresh = () => {
    settingsQuery.refetch()
    servicesQuery.refetch()
    promotionsQuery.refetch()
    loyaltyQuery.refetch()
  }

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
          <BusinessSkeleton />
        ) : loadError ? (
          <ErrorState message="No se pudo cargar tu negocio" onRetry={() => settingsQuery.refetch()} />
        ) : (
          <>
            {/* ─── Hero / Profile Details ─── */}
            <View style={styles.hero}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarCircle} cachePolicy="memory-disk" transition={100} />
                ) : (
                  <View style={styles.avatarCircle}>
                    {businessName ? (
                      <Text style={styles.avatarLetter}>{initials(businessName)}</Text>
                    ) : (
                      <Ionicons name="person-outline" size={36} color={GRAY} />
                    )}
                  </View>
                )}
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

            {/* ─── Navigation ─── */}
            <View style={styles.card}>
              <NavRow
                icon="cut-outline"
                label="Mis servicios"
                subtitle={serviceCount === 1 ? '1 servicio' : `${serviceCount} servicios`}
                onPress={() => router.push('/services' as Parameters<typeof router.push>[0])}
              />
              <View style={styles.rowDivider} />
              <NavRow
                icon="pricetag-outline"
                label="Promociones"
                subtitle={activePromoCount > 0 ? `${activePromoCount} activa${activePromoCount !== 1 ? 's' : ''}` : 'Sin promociones activas'}
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
                icon="people-outline"
                label="Mi equipo"
                subtitle={teamSubtitle()}
                onPress={() => router.push('/team' as Parameters<typeof router.push>[0])}
                locked={!isTeamPlan}
              />
              <View style={styles.rowDivider} />
              <NavRow
                icon="bar-chart-outline"
                label="Estadísticas"
                subtitle="Ver rendimiento del negocio"
                onPress={() => router.push('/stats' as Parameters<typeof router.push>[0])}
              />
            </View>

            {/* ─── Portfolio Gallery ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Text style={styles.bentoLabel}>GALERÍA</Text>
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 14, color: GRAY, textAlign: 'center' }}>Portafolio próximamente</Text>
              </View>
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
    height: 60, paddingHorizontal: 18,
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
  cardSkeleton: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  rowSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 64, paddingHorizontal: 18 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 },
})
