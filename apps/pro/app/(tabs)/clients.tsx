import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Animated, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getClients, createClient, type ClientItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, SURFACE, initials } from '../../lib/utils'

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
}

// ─── add client modal ─────────────────────────────────────────────────────────

const TAGS = ['VIP', 'Nueva', 'Regular', 'Frecuente'] as const

function AddClientModal({
  visible, onClose, onCreated,
}: {
  visible: boolean; onClose: () => void; onCreated: (c: ClientItem) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function reset() {
    setName(''); setPhone(''); setEmail(''); setNotes(''); setSelectedTags([])
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('', 'El nombre es requerido'); return }
    if (!phone.trim()) { Alert.alert('', 'El teléfono es requerido'); return }
    setSaving(true)
    try {
      const client = await createClient({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: selectedTags,
      })
      reset()
      onCreated(client)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      Alert.alert('Error', msg)
    } finally { setSaving(false) }
  }

  const slideAnim = useRef(new Animated.Value(500)).current
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 500, duration: 280, useNativeDriver: true,
    }).start()
    if (!visible) reset()
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Nueva clienta</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={modalStyles.label}>Nombre completo *</Text>
            <TextInput
              style={modalStyles.input} value={name} onChangeText={setName}
              placeholder="María García" placeholderTextColor="#AAAAAA"
            />

            <Text style={[modalStyles.label, { marginTop: 14 }]}>Teléfono *</Text>
            <TextInput
              style={modalStyles.input} value={phone} onChangeText={setPhone}
              placeholder="04141234567" placeholderTextColor="#AAAAAA"
              keyboardType="phone-pad"
            />

            <Text style={[modalStyles.label, { marginTop: 14 }]}>
              Email <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TextInput
              style={modalStyles.input} value={email} onChangeText={setEmail}
              placeholder="maria@email.com" placeholderTextColor="#AAAAAA"
              keyboardType="email-address" autoCapitalize="none"
            />

            <Text style={[modalStyles.label, { marginTop: 14 }]}>
              Notas <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TextInput
              style={[modalStyles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              value={notes} onChangeText={setNotes} multiline
              placeholder="Preferencias, alergias…" placeholderTextColor="#AAAAAA"
            />

            <Text style={[modalStyles.label, { marginTop: 14 }]}>Etiquetas</Text>
            <View style={modalStyles.tagsRow}>
              {TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[modalStyles.tagChip, active && modalStyles.tagChipActive]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.78}
                  >
                    <Text style={[modalStyles.tagText, active && { color: '#fff' }]}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[modalStyles.btnPrimary, { marginTop: 24, marginBottom: 8 }, saving && { opacity: 0.6 }]}
              onPress={handleCreate} disabled={saving} activeOpacity={0.85}
            >
              <Text style={modalStyles.btnPrimaryText}>{saving ? 'Creando…' : 'Crear clienta'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: ClientItem[] }

export default function ClientsScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

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

  function handleCreated(client: ClientItem) {
    setState(prev =>
      prev.kind === 'ok'
        ? { kind: 'ok', data: [client, ...prev.data] }
        : { kind: 'ok', data: [client] }
    )
    setShowAddModal(false)
  }

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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
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

const modalStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 20 },
  label: { fontSize: 12, color: GRAY, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 16, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  tagChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tagText: { fontSize: 13, fontWeight: '500', color: DARK },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})
