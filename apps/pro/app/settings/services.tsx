import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getServices, type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, formatMoney } from '../../lib/utils'

type LoadState = 'loading' | 'error' | 'ready'

export default function ServicesScreen() {
  const [state, setState] = useState<LoadState>('loading')
  const [services, setServices] = useState<ServiceItem[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const data = await getServices()
      setServices(data)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

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
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      )}

      {state === 'error' && (
        <View style={styles.center}>
          <Text style={styles.grayText}>No se pudieron cargar los servicios</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'ready' && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
        >
          {services.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cut-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>Sin servicios configurados</Text>
              <Text style={styles.emptyHint}>Agrega servicios desde el panel web en getmusa.app</Text>
            </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#AAAAAA' },
  emptyHint: { fontSize: 13, color: '#CCCCCC', textAlign: 'center', paddingHorizontal: 24 },
})
