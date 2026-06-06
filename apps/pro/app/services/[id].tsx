import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { getServices, updateService, deleteService, type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF, MONO, formatMoney } from '../../lib/utils'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

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
    <Animated.View style={{ opacity: op, paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
      {[140, 180, 100].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function ServiceEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [service, setService] = useState<ServiceItem | null>(null)

  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState(30)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const all = await getServices()
      const found = all.find(s => s.id === id)
      if (!found) { setLoadState('error'); return }
      setService(found)
      setName(found.name)
      setDurationMin(found.durationMin)
      setPrice(String(found.price))
      setDescription(found.description ?? '')
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!name.trim()) { Alert.alert('', 'El nombre es requerido'); return }
    setSaving(true)
    try {
      await updateService(id!, {
        name: name.trim(),
        durationMin,
        price: parseFloat(price) || 0,
        description: description.trim() || undefined,
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch {
      Alert.alert('Error', 'No se pudo guardar el servicio')
    } finally { setSaving(false) }
  }

  function handleDelete() {
    Alert.alert(
      'Eliminar servicio',
      `¿Eliminar "${name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteService(id!)
              router.back()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el servicio')
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {service?.name ?? 'Servicio'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loadState === 'loading' && <ScrollView><Skeleton /></ScrollView>}

      {loadState === 'error' && (
        <View style={styles.center}>
          <Text style={styles.grayText}>No se pudo cargar el servicio</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información del servicio</Text>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#AAAAAA"
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Duración</Text>
              <View style={styles.pillsRow}>
                {DURATION_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationPill, durationMin === d && styles.durationPillActive]}
                    onPress={() => setDurationMin(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.durationPillText, durationMin === d && { color: '#fff' }]}>
                      {d} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Precio</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholderTextColor="#AAAAAA"
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Descripción <Text style={{ color: GRAY }}>(opcional)</Text></Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor="#AAAAAA"
                placeholder="Describe el servicio…"
              />
            </View>

            {/* Delete */}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#C62828" />
              <Text style={styles.deleteBtnText}>{deleting ? 'Eliminando…' : 'Eliminar servicio'}</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            {savedMsg ? (
              <View style={styles.savedBadge}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D32" />
                <Text style={styles.savedText}>Guardado ✓</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '500', color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 16 },
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
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#C62828',
    paddingHorizontal: 20, justifyContent: 'center', marginBottom: 8,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '500', color: '#C62828' },
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#FAFAF9' },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  savedText: { fontSize: 16, fontWeight: '500', color: '#2E7D32' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})
