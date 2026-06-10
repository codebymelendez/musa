import { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { PRIMARY, DARK, BORDER, GRAY, MONO, formatMoney, formatBs } from '../../lib/utils'

const BentoStats = memo(function BentoStats({
  appointmentsCount, nextApptLabel, cobradoUSD, cobradoBs, completedSinCobro,
  newClientsCount, weeklyRevenue, weeklyRevenueBs, monthlyRevenue, monthlyRevenueBs,
}: {
  appointmentsCount: number
  nextApptLabel: string
  cobradoUSD: number
  cobradoBs: number
  completedSinCobro: number
  newClientsCount: number | null
  weeklyRevenue: number | null
  weeklyRevenueBs?: number | null
  monthlyRevenue: number | null
  monthlyRevenueBs?: number | null
}) {
  return (
    <View style={styles.bentoContainer}>
      {/* Row 1: Citas hoy (full, dark) */}
      <View style={styles.apptsTodayCard}>
        <Text style={[styles.bentoLabel, { color: '#fff', opacity: 0.6 }]}>CITAS DE HOY</Text>
        <Text style={[styles.bentoValLarge, { fontFamily: MONO, color: '#fff' }]}>
          {appointmentsCount}
        </Text>
        <Text style={[styles.bentoSubText, { color: '#fff', opacity: 0.7 }]}>{nextApptLabel}</Text>
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
                  {formatBs(cobradoBs)}
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
          {(weeklyRevenueBs ?? 0) > 0 && (
            <Text style={[styles.bentoBsLine, { fontFamily: MONO }]}>
              {formatBs(weeklyRevenueBs!)}
            </Text>
          )}
        </View>

        <View style={[styles.halfCard, styles.halfCardCompact, { backgroundColor: '#F5F0EB' }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.bentoLabel}>ING. MES</Text>
          </View>
          <Text style={[styles.bentoValSm, { fontFamily: MONO }]}>
            {monthlyRevenue !== null ? formatMoney(monthlyRevenue) : '—'}
          </Text>
          {(monthlyRevenueBs ?? 0) > 0 && (
            <Text style={[styles.bentoBsLine, { fontFamily: MONO }]}>
              {formatBs(monthlyRevenueBs!)}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
})

export default BentoStats

const styles = StyleSheet.create({
  bentoContainer: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bentoLabel: { fontSize: 10, fontWeight: '600', color: GRAY, letterSpacing: 0.8 },
  bentoValLarge: { fontSize: 34, color: DARK, fontWeight: 'normal', marginTop: 12 },
  bentoSubText: { fontSize: 11, color: GRAY, marginTop: 4 },
  bentoVal: { fontSize: 24, color: DARK, fontWeight: 'normal', marginTop: 8 },
  bentoValSm: { fontSize: 18, color: DARK, fontWeight: 'normal', marginTop: 6 },
  bentoBsLine: { fontSize: 12, color: GRAY, marginTop: 2 },
  apptsTodayCard: {
    backgroundColor: DARK, borderRadius: 16,
    padding: 18, height: 120, justifyContent: 'space-between',
  },
  subStatsRow: { flexDirection: 'row', gap: 10 },
  halfCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, height: 110, justifyContent: 'space-between',
  },
  halfCardCompact: { height: undefined, minHeight: 86 },
  cobrarBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  cobrarDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E67E22' },
  cobrarBadgeText: { fontSize: 10, color: '#E67E22', fontWeight: '500' },
})
