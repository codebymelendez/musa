import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, Animated, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  getPromotions, createPromotion, broadcastPromotion,
  type PromotionItem,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF } from '../../lib/utils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDisplayDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function parseDisplayDate(str: string): string | null {
  // DD/MM/YYYY → ISO date
  const parts = str.replace(/\D/g, '').slice(0, 8)
  if (parts.length < 8) return null
  const d = parts.slice(0, 2)
  const m = parts.slice(2, 4)
  const y = parts.slice(4, 8)
  const date = new Date(`${y}-${m}-${d}T00:00:00`)
  if (isNaN(date.getTime())) return null
  return date.toISOString()
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function promoStatus(p: PromotionItem): 'active' | 'inactive' | 'expired' {
  if (!p.isActive) return 'inactive'
  if (p.validUntil && new Date(p.validUntil) < new Date()) return 'expired'
  return 'active'
}

const STATUS_CONFIG = {
  active:   { label: 'Activa',   bg: '#E8F5E9', text: '#2E7D32' },
  inactive: { label: 'Inactiva', bg: '#F5F5F5', text: '#757575' },
  expired:  { label: 'Expirada', bg: '#FDECEA', text: '#C62828' },
}

// ─── promotion card ───────────────────────────────────────────────────────────

function PromoCard({ item, onBroadcast }: { item: PromotionItem; onBroadcast: () => void }) {
  const status = promoStatus(item)
  const { label, bg, text } = STATUS_CONFIG[status]

  return (
    <TouchableOpacity
      style={promoStyles.card}
      onPress={() => router.push(`/promotions/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.75}
    >
      <View style={promoStyles.cardTop}>
        <View style={promoStyles.cardTitleRow}>
          <Text style={promoStyles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[promoStyles.statusPill, { backgroundColor: bg }]}>
            <Text style={[promoStyles.statusText, { color: text }]}>{label}</Text>
          </View>
        </View>

        <View style={promoStyles.discountBadge}>
          <Text style={[promoStyles.discountText, { fontFamily: MONO }]}>-{item.discount}%</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={promoStyles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={promoStyles.datesRow}>
        <Ionicons name="calendar-outline" size={13} color={GRAY} />
        <Text style={[promoStyles.dateText, { fontFamily: MONO }]}>
          {formatDisplayDate(item.validFrom)} → {formatDisplayDate(item.validUntil)}
        </Text>
      </View>

      {status === 'active' && (
        <TouchableOpacity
          style={promoStyles.broadcastBtn}
          onPress={e => { e.stopPropagation(); onBroadcast() }}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={15} color={PRIMARY} />
          <Text style={promoStyles.broadcastBtnText}>Enviar notificación</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

// ─── create modal ─────────────────────────────────────────────────────────────

function CreateModal({
  visible, onClose, onCreated,
}: {
  visible: boolean; onClose: () => void; onCreated: (p: PromotionItem) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle(''); setDescription(''); setDiscount('')
    setValidFrom(''); setValidUntil(''); setIsActive(true)
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('', 'El título es requerido'); return }
    if (!discount.trim()) { Alert.alert('', 'El descuento es requerido'); return }
    setSaving(true)
    try {
      const p = await createPromotion({
        title: title.trim(),
        description: description.trim() || undefined,
        discount: parseFloat(discount) || 0,
        validFrom: parseDisplayDate(validFrom) ?? undefined,
        validUntil: parseDisplayDate(validUntil) ?? undefined,
        isActive,
      })
      reset()
      onCreated(p)
    } catch {
      Alert.alert('Error', 'No se pudo crear la promoción')
    } finally { setSaving(false) }
  }

  const slideAnim = useRef(new Animated.Value(400)).current
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 400, duration: 260, useNativeDriver: true,
    }).start()
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={promoStyles.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[promoStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={promoStyles.sheetHandle} />
          <Text style={promoStyles.sheetTitle}>Nueva promoción</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={promoStyles.label}>Título *</Text>
            <TextInput style={promoStyles.input} value={title} onChangeText={setTitle}
              placeholder="Ej: 20% en cortes este mes" placeholderTextColor="#AAAAAA" />

            <Text style={[promoStyles.label, { marginTop: 14 }]}>Descripción <Text style={{ color: GRAY }}>(opcional)</Text></Text>
            <TextInput
              style={[promoStyles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              value={description} onChangeText={setDescription} multiline
              placeholder="Describe los términos de la promoción…" placeholderTextColor="#AAAAAA" />

            <Text style={[promoStyles.label, { marginTop: 14 }]}>Descuento % *</Text>
            <TextInput style={promoStyles.input} value={discount} onChangeText={setDiscount}
              placeholder="20" placeholderTextColor="#AAAAAA" keyboardType="decimal-pad" />

            <View style={promoStyles.datesInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={promoStyles.label}>Fecha inicio</Text>
                <TextInput style={promoStyles.input} value={validFrom}
                  onChangeText={v => setValidFrom(formatDateInput(v))}
                  placeholder="DD/MM/YYYY" placeholderTextColor="#AAAAAA" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={promoStyles.label}>Fecha fin</Text>
                <TextInput style={promoStyles.input} value={validUntil}
                  onChangeText={v => setValidUntil(formatDateInput(v))}
                  placeholder="DD/MM/YYYY" placeholderTextColor="#AAAAAA" keyboardType="number-pad" />
              </View>
            </View>

            <View style={promoStyles.toggleRow}>
              <Text style={promoStyles.toggleLabel}>Activa desde el inicio</Text>
              <Switch value={isActive} onValueChange={setIsActive}
                trackColor={{ false: '#DDDDDD', true: PRIMARY }} thumbColor="#fff" />
            </View>

            <TouchableOpacity
              style={[promoStyles.btnPrimary, { marginTop: 20, marginBottom: 8 }, saving && { opacity: 0.6 }]}
              onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
              <Text style={promoStyles.btnPrimaryText}>{saving ? 'Creando…' : 'Crear promoción'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

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
    <Animated.View style={{ opacity: op, paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ height: 130, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'

export default function PromotionsScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [promos, setPromos] = useState<PromotionItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const data = await getPromotions()
      setPromos(data)
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  function handleBroadcast(p: PromotionItem) {
    Alert.alert(
      'Enviar notificación',
      `¿Enviar notificación push de "${p.title}" a todas tus clientas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              await broadcastPromotion(p.id)
              Alert.alert('', 'Notificación enviada correctamente')
            } catch {
              Alert.alert('Error', 'No se pudo enviar la notificación')
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={promoStyles.safe} edges={['top']}>
      <View style={promoStyles.header}>
        <TouchableOpacity style={promoStyles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={promoStyles.headerTitle}>Promociones</Text>
        <View style={promoStyles.backBtn} />
      </View>

      {loadState === 'loading' && !refreshing && <Skeleton />}

      {loadState === 'error' && (
        <View style={promoStyles.center}>
          <Text style={promoStyles.grayText}>No se pudieron cargar las promociones</Text>
          <TouchableOpacity style={promoStyles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={promoStyles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && promos.length === 0 && (
        <View style={promoStyles.emptyState}>
          <Ionicons name="pricetag-outline" size={56} color="#DDDDDD" />
          <Text style={promoStyles.emptyTitle}>Sin promociones activas</Text>
          <Text style={promoStyles.emptyHint}>Crea promociones y notifica a tus clientas con un tap</Text>
          <TouchableOpacity style={[promoStyles.btnPrimary, { paddingHorizontal: 28 }]}
            onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Text style={promoStyles.btnPrimaryText}>Crear primera promoción</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && promos.length > 0 && (
        <FlatList
          data={promos}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
          renderItem={({ item }) => (
            <PromoCard item={item} onBroadcast={() => handleBroadcast(item)} />
          )}
        />
      )}

      {loadState === 'ready' && promos.length > 0 && (
        <TouchableOpacity style={promoStyles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <CreateModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={p => { setPromos(prev => [p, ...prev]); setShowModal(false) }}
      />
    </SafeAreaView>
  )
}

const promoStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: SERIF, fontSize: 22, color: DARK },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 16, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  cardTitleRow: { flex: 1, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: DARK },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '500' },
  discountBadge: {
    backgroundColor: '#FDF0EC', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: '#F5D8CE',
  },
  discountText: { fontSize: 14, fontWeight: '500', color: PRIMARY },
  description: { fontSize: 14, color: GRAY, marginBottom: 8, lineHeight: 20 },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dateText: { fontSize: 12, color: GRAY },
  broadcastBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: 19, borderWidth: 1, borderColor: PRIMARY,
    paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  broadcastBtnText: { fontSize: 13, fontWeight: '500', color: PRIMARY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '500', color: DARK, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: GRAY, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '90%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 20 },
  label: { fontSize: 12, color: GRAY, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  datesInputRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  toggleLabel: { fontSize: 15, color: DARK, fontWeight: '500' },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})
