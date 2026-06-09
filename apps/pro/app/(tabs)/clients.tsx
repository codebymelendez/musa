import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { getClients, type ClientItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, SURFACE, initials } from '../../lib/utils'
import AddClientModal from '../../components/AddClientModal'
import { cacheManager } from '../../lib/cache'
import { ob } from '../../lib/observability'

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
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
    <>
      {[70, 60, 75, 55, 65, 58].map((w, i) => (
        <Animated.View key={i} style={[styles.skeletonRow, { opacity }]}>
          <View style={styles.skeletonAvatar} />
          <View style={{ flex: 1 }}>
            <View style={[styles.skeletonLine, { width: `${w}%` }]} />
            <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
          </View>
        </Animated.View>
      ))}
    </>
  )
}

// ─── empty ────────────────────────────────────────────────────────────────────

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="people-outline" size={52} color="#CCCCCC" />
      <Text style={styles.emptyText}>
        {searching ? 'Sin resultados para esa búsqueda' : 'No tienes clientas aún'}
      </Text>
    </View>
  )
}

// ─── client row ───────────────────────────────────────────────────────────────

const ClientRow = memo(function ClientRow({
  item,
  onPress,
}: {
  item: ClientItem
  onPress: (id: string) => void
}) {
  const count = item.appointments?.length ?? 0

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item.id)} activeOpacity={0.72}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.name)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        <View style={styles.tagRow}>
          {item.tags?.slice(0, 2).map(t => (
            <View key={t} style={styles.inlineTag}>
              <Text style={styles.inlineTagText}>{t}</Text>
            </View>
          ))}
          {(!item.tags || item.tags.length === 0) && (
            <Text style={styles.rowPhone}>{item.phone}</Text>
          )}
        </View>
      </View>
      <View style={styles.rowRightCol}>
        <Text style={styles.rowCountText}>{count} {count !== 1 ? 'visitas' : 'visita'}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={16} color="#CCCCCC" />
    </TouchableOpacity>
  )
})


// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: ClientItem[] }

export default function ClientsScreen() {
  const [state, setState] = useState<State>(() => {
    const cache = cacheManager.get('clients') as ClientItem[] | null
    if (cache) {
      return { kind: 'ok', data: cache }
    }
    return { kind: 'loading' }
  })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const load = useCallback(async (force = false) => {
    const cache = cacheManager.get('clients') as ClientItem[] | null
    const timestamp = cacheManager.getTimestamp('clients')

    if (cache) {
      setState({ kind: 'ok', data: cache })
      if (!force && (Date.now() - timestamp < 30000)) {
        return
      }
    } else {
      setState({ kind: 'loading' })
    }

    try {
      const data = await getClients()
      cacheManager.set('clients', data)
      setState({ kind: 'ok', data })
    } catch (e) {
      ob.logError('ClientsScreen load', e)
      if (!cache) {
        setState({ kind: 'error' })
      }
    }
  }, [])

  // Telemetry of render time
  useEffect(() => {
    const endTrack = ob.trackTime()
    load(false).then(() => {
      ob.logPerformance('ClientsScreen', endTrack())
    })
  }, [load])

  // Reactive subscription
  useEffect(() => {
    return cacheManager.subscribe('clients', () => {
      if (!cacheManager.has('clients')) {
        load(true)
      }
    })
  }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(true); setRefreshing(false) }

  const filtered = state.kind === 'ok'
    ? state.data.filter(c => {
        const q = query.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.phone.includes(q)
      })
    : []

  function handleCreated(client: ClientItem) {
    setState(prev => {
      const nextData = prev.kind === 'ok'
        ? [client, ...prev.data]
        : [client]
      cacheManager.set('clients', nextData)
      return { kind: 'ok', data: nextData }
    })
    cacheManager.invalidate('dashboard')
    setShowAddModal(false)
  }

  const handleClientPress = useCallback((id: string) => {
    router.push(`/clients/${id}` as Parameters<typeof router.push>[0])
  }, [])

  const renderItem = useCallback(({ item }: { item: ClientItem }) => (
    <ClientRow
      item={item}
      onPress={handleClientPress}
    />
  ), [handleClientPress])

  const totalAppointments = filtered.reduce((acc, c) => acc + (c.appointments?.length ?? 0), 0)
  const activeClients = filtered.length

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Directorio</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu clientela con precisión editorial.</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={GRAY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o teléfono…"
            placeholderTextColor="#AAAAAA"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#CCCCCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Bento Overview (Directory stats) */}
      {state.kind === 'ok' && (
        <View style={styles.statsBento}>
          <View style={styles.portfolioCard}>
            <Text style={styles.bentoLabel}>CITAS TOTALES</Text>
            <Text style={[styles.bentoVal, { fontFamily: MONO }]}>{totalAppointments}</Text>
          </View>
          <View style={styles.activeClientsCard}>
            <Text style={[styles.bentoLabel, { color: DARK }]}>CLIENTAS ACTIVAS</Text>
            <Text style={[styles.bentoVal, { fontFamily: MONO, color: DARK }]}>{activeClients}</Text>
          </View>
        </View>
      )}

      {state.kind === 'loading' && <View style={styles.listPad}><SkeletonRows /></View>}

      {state.kind === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>No se pudieron cargar las clientas</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(true)} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.kind === 'ok' && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : styles.listPad}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<EmptyState searching={query.length > 0} />}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          setShowAddModal(true)
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddClientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleCreated}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontFamily: SERIF, fontSize: 32, color: DARK },
  headerSubtitle: { fontSize: 13, color: GRAY, marginTop: 4, lineHeight: 18 },
  
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: SURFACE },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'transparent', borderBottomWidth: 2, borderBottomColor: 'rgba(181, 89, 62, 0.2)',
    height: 48, paddingHorizontal: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: DARK },
  
  statsBento: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  portfolioCard: {
    flex: 1.6, backgroundColor: PRIMARY, borderRadius: 16, padding: 14,
    justifyContent: 'space-between', height: 110,
  },
  bentoLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 },
  bentoVal: { fontSize: 24, color: '#fff', fontWeight: '500', marginTop: 8 },
  bentoTrendText: { fontSize: 10, color: '#fff', opacity: 0.9 },
  
  activeClientsCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, justifyContent: 'space-between', height: 110,
  },

  listPad: { paddingTop: 8, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: SURFACE,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '500', color: PRIMARY },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  inlineTag: { backgroundColor: 'rgba(181, 89, 62, 0.08)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  inlineTagText: { fontSize: 10, color: PRIMARY, fontWeight: '500' },
  rowPhone: { fontSize: 13, color: GRAY },
  rowRightCol: { alignItems: 'flex-end', gap: 2, marginRight: 4 },
  rowSpend: { fontSize: 15, fontWeight: '500', color: PRIMARY },
  rowCountText: { fontSize: 11, color: GRAY },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 78 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#AAAAAA', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0EDE9' },
  skeletonLine: { height: 13, backgroundColor: '#F0EDE9', borderRadius: 6 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
})

