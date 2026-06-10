import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, Animated, PanResponder, Alert,
  RefreshControl, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, formatMoney } from '../../lib/utils'
import { useServices, useCreateService, useDeleteService } from '../../hooks/queries'

// ─── duration pills ───────────────────────────────────────────────────────────

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

// ─── swipeable row ────────────────────────────────────────────────────────────

const SwipeableRow = memo(function SwipeableRow({
  item, onEdit, onDelete,
}: {
  item: ServiceItem
  onEdit: (item: ServiceItem) => void
  onDelete: (item: ServiceItem) => void
}) {
  const translateX = useRef(new Animated.Value(0)).current
  const [revealed, setRevealed] = useState(false)

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8,
    onPanResponderMove: (_, g) => {
      const clamped = Math.max(-80, Math.min(0, g.dx))
      translateX.setValue(clamped)
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -36) {
        Animated.timing(translateX, { toValue: -80, duration: 150, useNativeDriver: true }).start()
        setRevealed(true)
      } else {
        Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }).start()
        setRevealed(false)
      }
    },
  })).current

  function close() {
    Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }).start()
    setRevealed(false)
  }

  return (
    <View style={svcStyles.rowWrap}>
      {/* delete button revealed on swipe */}
      <View style={svcStyles.deleteAction}>
        <TouchableOpacity style={svcStyles.deleteBtn} onPress={() => { close(); onDelete(item) }} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={svcStyles.deleteBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity style={svcStyles.card} onPress={() => { close(); onEdit(item) }} activeOpacity={0.75}>
          <View style={svcStyles.cardLeft}>
            <Text style={svcStyles.svcName}>{item.name}</Text>
            {item.category ? <Text style={svcStyles.svcCategory}>{item.category}</Text> : null}
            <Text style={[svcStyles.svcDuration, { fontFamily: MONO }]}>{item.durationMin} min</Text>
          </View>
          <Text style={[svcStyles.svcPrice, { fontFamily: MONO }]}>
            {formatMoney(item.price, item.currency)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
})

// ─── create modal ────────────────────────────────────────────────────────────

function CreateModal({
  visible, onClose, onCreated,
}: {
  visible: boolean; onClose: () => void; onCreated: (svc: ServiceItem) => void
}) {
  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState(30)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const createServiceMutation = useCreateService()
  const saving = createServiceMutation.isPending

  function reset() {
    setName(''); setDurationMin(30); setPrice(''); setDescription('')
  }

  async function handleCreate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!name.trim()) { Alert.alert('', 'El nombre es requerido'); return }
    try {
      const svc = await createServiceMutation.mutateAsync({
        name: name.trim(),
        durationMin,
        price: parseFloat(price) || 0,
        description: description.trim() || undefined,
      })
      reset()
      onCreated(svc)
    } catch {
      Alert.alert('Error', 'No se pudo crear el servicio')
    }
  }

  const slideAnim = useRef(new Animated.Value(400)).current
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start()
    } else {
      slideAnim.setValue(400)
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={svcStyles.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[svcStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={svcStyles.sheetHandle} />
          <Text style={svcStyles.sheetTitle}>Nuevo servicio</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={svcStyles.label}>Nombre *</Text>
            <TextInput
              style={svcStyles.input}
              placeholder="Ej: Corte y peinado"
              placeholderTextColor="#AAAAAA"
              value={name}
              onChangeText={setName}
            />

            <Text style={[svcStyles.label, { marginTop: 16 }]}>Duración</Text>
            <View style={svcStyles.pillsRow}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[svcStyles.durationPill, durationMin === d && svcStyles.durationPillActive]}
                  onPress={() => setDurationMin(d)}
                  activeOpacity={0.8}
                >
                  <Text style={[svcStyles.durationPillText, durationMin === d && { color: '#fff' }]}>
                    {d} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[svcStyles.label, { marginTop: 16 }]}>Precio</Text>
            <TextInput
              style={svcStyles.input}
              placeholder="0.00"
              placeholderTextColor="#AAAAAA"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <Text style={[svcStyles.label, { marginTop: 16 }]}>Descripción <Text style={{ color: GRAY }}>(opcional)</Text></Text>
            <TextInput
              style={[svcStyles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Describe el servicio…"
              placeholderTextColor="#AAAAAA"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity
              style={[svcStyles.btnPrimary, { marginTop: 20, marginBottom: 8 }, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={svcStyles.btnPrimaryText}>{saving ? 'Creando…' : 'Crear servicio'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={svcStyles.emptyState}>
      <Ionicons name="cut-outline" size={56} color="#DDDDDD" />
      <Text style={svcStyles.emptyTitle}>Aún no tienes servicios</Text>
      <Text style={svcStyles.emptyHint}>Añade tus servicios para que las clientas puedan reservar</Text>
      <TouchableOpacity style={[svcStyles.btnPrimary, { paddingHorizontal: 28 }]} onPress={onAdd} activeOpacity={0.85}>
        <Text style={svcStyles.btnPrimaryText}>Añadir primer servicio</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── skeleton ────────────────────────────────────────────────────────────────

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
    <Animated.View style={{ opacity: op, paddingHorizontal: 20, paddingTop: 20, gap: 10 }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ height: 72, backgroundColor: '#F0EDE9', borderRadius: 14 }} />
      ))}
    </Animated.View>
  )
}

// ─── screen ──────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'

export default function ServicesScreen() {
  const servicesQuery = useServices()
  const deleteServiceMutation = useDeleteService()
  const [showModal, setShowModal] = useState(false)

  const services: ServiceItem[] = servicesQuery.data ?? []
  const loadState: LoadState = servicesQuery.data
    ? 'ready'
    : servicesQuery.isLoading
      ? 'loading'
      : 'error'

  const refreshing = servicesQuery.isRefetching
  const load = () => { servicesQuery.refetch() }
  const onRefresh = () => { servicesQuery.refetch() }

  const handleDelete = useCallback((svc: ServiceItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Eliminar servicio',
      `¿Eliminar "${svc.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await deleteServiceMutation.mutateAsync(svc.id)
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el servicio')
            }
          },
        },
      ]
    )
  }, [deleteServiceMutation.mutateAsync])

  const handleEdit = useCallback((svc: ServiceItem) => {
    router.push(`/services/${svc.id}` as Parameters<typeof router.push>[0])
  }, [])

  const renderItem = useCallback(({ item }: { item: ServiceItem }) => (
    <SwipeableRow item={item} onEdit={handleEdit} onDelete={handleDelete} />
  ), [handleEdit, handleDelete])

  return (
    <SafeAreaView style={svcStyles.safe} edges={['top']}>
      <View style={svcStyles.header}>
        <TouchableOpacity style={svcStyles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={svcStyles.headerTitle}>Servicios</Text>
        <View style={svcStyles.backBtn} />
      </View>

      {loadState === 'loading' && !refreshing && <Skeleton />}

      {loadState === 'error' && (
        <View style={svcStyles.center}>
          <Text style={svcStyles.grayText}>No se pudieron cargar los servicios</Text>
          <TouchableOpacity style={svcStyles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={svcStyles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && services.length === 0 && (
        <EmptyState onAdd={() => setShowModal(true)} />
      )}

      {loadState === 'ready' && services.length > 0 && (
        <FlatList
          data={services}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
          renderItem={renderItem}
        />
      )}

      {/* FAB */}
      {loadState === 'ready' && (
        <TouchableOpacity style={svcStyles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <CreateModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          // useCreateService already invalidates the services query
          setShowModal(false)
        }}
      />
    </SafeAreaView>
  )
}

const svcStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: SERIF, fontSize: 22, color: DARK },
  rowWrap: { marginBottom: 10, overflow: 'hidden', borderRadius: 14 },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 80, backgroundColor: '#C62828',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, width: '100%' },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
  },
  cardLeft: { flex: 1, gap: 3 },
  svcName: { fontSize: 15, fontWeight: '500', color: DARK },
  svcCategory: { fontSize: 12, color: GRAY },
  svcDuration: { fontSize: 12, color: GRAY },
  svcPrice: { fontSize: 15, fontWeight: '500', color: DARK },
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
  // modal
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40,
    maxHeight: '85%',
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
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationPill: {
    paddingHorizontal: 14, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  durationPillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  durationPillText: { fontSize: 13, fontWeight: '500', color: DARK },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})
