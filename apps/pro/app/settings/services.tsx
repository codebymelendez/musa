import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, formatMoney } from '../../lib/utils'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { useServices } from '../../hooks/queries'

type LoadState = 'loading' | 'error' | 'ready'

export default function ServicesScreen() {
  const servicesQuery = useServices()

  const services: ServiceItem[] = servicesQuery.data ?? []
  const state: LoadState = servicesQuery.data
    ? 'ready'
    : servicesQuery.isLoading
      ? 'loading'
      : 'error'

  const refreshing = servicesQuery.isRefetching
  const load = () => { servicesQuery.refetch() }
  const onRefresh = () => { servicesQuery.refetch() }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back-outline" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Servicios</Text>
        <View style={styles.backBtn} />
      </View>

      {state === 'loading' && !refreshing && (
        <Pulse style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <Bone key={i} height={72} radius={14} />
          ))}
        </Pulse>
      )}

      {state === 'error' && (
        <ErrorState message="No se pudieron cargar los servicios" onRetry={load} />
      )}

      {state === 'ready' && (
        <ScrollView
          contentContainerStyle={[styles.content, services.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
        >
          {services.length === 0 ? (
            <EmptyState
              icon="cut-outline"
              title="Sin servicios configurados"
              subtitle="Añade tus servicios para que las clientas puedan reservar."
              ctaLabel="Añadir mi primer servicio"
              onCtaPress={() => router.push('/services' as Parameters<typeof router.push>[0])}
            />
          ) : (
            services.map(svc => (
              <View key={svc.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.svcName}>{svc.name}</Text>
                  {svc.category ? (
                    <Text style={styles.svcCategory}>{svc.category}</Text>
                  ) : null}
                  <Text style={styles.svcDuration}>{svc.durationMin} min</Text>
                </View>
                <Text style={[styles.svcPrice, { fontFamily: MONO }]}>
                  {formatMoney(svc.price, svc.currency)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: DARK },
  content: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  cardLeft: { flex: 1, gap: 3 },
  svcName: { fontSize: 15, fontWeight: '500', color: DARK },
  svcCategory: { fontSize: 12, color: GRAY },
  svcDuration: { fontSize: 12, color: GRAY },
  svcPrice: { fontSize: 15, color: DARK, fontWeight: '500' },
})
