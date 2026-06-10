import { useState, useCallback, useMemo, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { type ClientItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, SURFACE, initials } from '../../lib/utils'
import AddClientModal from '../../components/AddClientModal'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { useClients } from '../../hooks/queries'

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[70, 60, 75, 55, 65, 58].map((w, i) => (
        <Pulse key={i} style={styles.skeletonRow}>
          <Bone width={44} height={44} radius={22} />
          <View style={{ flex: 1 }}>
            <Bone height={13} width={`${w}%`} />
            <Bone height={13} width="40%" style={{ marginTop: 6 }} />
          </View>
        </Pulse>
      ))}
    </>
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
  const { data, isLoading, refetch, isRefetching } = useClients()
  const [query, setQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const state: State = data
    ? { kind: 'ok', data }
    : isLoading
      ? { kind: 'loading' }
      : { kind: 'error' }

  const refreshing = isRefetching
  const onRefresh = () => { refetch() }

  const filtered = useMemo(() => {
    if (state.kind !== 'ok') return []
    const q = query.toLowerCase()
    return state.data.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
  }, [state.kind === 'ok' ? state.data : null, query])

  function handleCreated(_client: ClientItem) {
    // useCreateClient already updates the clients cache and invalidates the dashboard
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
        <ErrorState message="No se pudieron cargar las clientas" onRetry={() => refetch()} />
      )}

      {state.kind === 'ok' && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : styles.listPad}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            query.length > 0 ? (
              <EmptyState icon="search-outline" title="Sin resultados" subtitle="Prueba con otro nombre o teléfono." />
            ) : (
              <EmptyState
                icon="people-outline"
                title="Aún no tienes clientas"
                subtitle="Tu directorio crece con cada reserva. Empieza agregando tu primera clienta."
                ctaLabel="Agregar mi primera clienta"
                onCtaPress={() => setShowAddModal(true)}
              />
            )
          }
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
  skeletonRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
})

