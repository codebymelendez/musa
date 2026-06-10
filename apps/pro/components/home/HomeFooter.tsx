import { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { normalizeISODate, type PromotionItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF } from '../../lib/utils'

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(normalizeISODate(iso))
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export type QuickAction = {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
}

const PromoRow = memo(function PromoRow({ promo }: { promo: PromotionItem }) {
  return (
    <TouchableOpacity
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
          <Text style={styles.promoDate}>Válida hasta {shortDate(promo.validUntil)}</Text>
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
  )
})

// Promos + consejo + acceso rápido. Bounded content (promos vienen ya
// limitadas por el dashboard), so it lives in the FlatList footer.
const HomeFooter = memo(function HomeFooter({
  promos, quickActions,
}: {
  promos: PromotionItem[]
  quickActions: QuickAction[]
}) {
  return (
    <View>
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
            {promos.map(promo => <PromoRow key={promo.id} promo={promo} />)}
          </View>
        </View>
      )}

      {/* ─── Pro Insights Spotlight ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle2}>RECOMENDACIONES DE NEGOCIO</Text>
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
        <Text style={styles.sectionTitle2}>ACCESO RÁPIDO</Text>
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
    </View>
  )
})

export default HomeFooter

const styles = StyleSheet.create({
  section: { marginBottom: 24, marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: GRAY, letterSpacing: 0.8 },
  sectionTitle2: { fontSize: 11, fontWeight: '600', color: GRAY, letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 12 },
  viewAllBtn: { fontSize: 11, fontWeight: '600', color: PRIMARY, letterSpacing: 0.5 },

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

  insightsCard: { marginHorizontal: 20, height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EDE8E4' },
  insightsOverlay: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: 'space-between' },
  insightsTitle: { fontFamily: SERIF, fontSize: 18, color: DARK },
  insightsDesc: { fontSize: 13, color: GRAY, lineHeight: 18 },
  insightsBtn: { height: 40, borderWidth: 1, borderColor: DARK, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  insightsBtnText: { fontSize: 12, fontWeight: '600', color: DARK, letterSpacing: 0.5 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  quickCard: {
    width: '48%', height: 74, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  quickLabel: { fontSize: 12, fontWeight: '500', color: DARK },
})
