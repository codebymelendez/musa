import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getClients, type ClientItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, initials } from '../../lib/utils'

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

function ClientRow({ item, onPress }: { item: ClientItem; onPress: () => void }) {
  const count = item.appointments?.length ?? 0
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.name)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowPhone}>{item.phone}</Text>
      </View>
      {count > 0 && (
        <Text style={[styles.rowCount, { fontFamily: MONO }]}>
          {count} cita{count !== 1 ? 's' : ''}
        </Text>
      )}
      <Ionicons name="chevron-forward-outline" size={18} color="#CCCCCC" />
    </TouchableOpacity>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: ClientItem[] }

export default function ClientsScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      setState({ kind: 'ok', data: await getClients() })
    } catch {
      setState({ kind: 'error' })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const filtered = state.kind === 'ok'
    ? state.data.filter(c => {
        const q = query.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.phone.includes(q)
      })
    : []

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clientas</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={GRAY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o teléfono"
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

      {state.kind === 'loading' && <View style={styles.listPad}><SkeletonRows /></View>}

      {state.kind === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>No se pudieron cargar las clientas</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
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
          renderItem={({ item }) => (
            <ClientRow
              item={item}
              onPress={() => router.push(`/clients/${item.id}` as Parameters<typeof router.push>[0])}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: SERIF, fontSize: 28, color: DARK },
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F3F0', borderRadius: 12, height: 44, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: DARK },
  listPad: { paddingTop: 8, paddingBottom: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: '#fff',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '500', color: PRIMARY },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 2 },
  rowPhone: { fontSize: 13, color: GRAY },
  rowCount: { fontSize: 12, color: GRAY, marginRight: 4 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 78 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#AAAAAA', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0EDE9' },
  skeletonLine: { height: 13, backgroundColor: '#F0EDE9', borderRadius: 6 },
})
