import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF, MONO, formatMoney } from '../../lib/utils'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import { validate, serviceFormSchema } from '../../lib/validation'
import { useServices, useUpdateService, useDeleteService } from '../../hooks/queries'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

function ServiceSkeleton() {
  return (
    <Pulse style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
      {[140, 180, 100].map((h, i) => (
        <Bone key={i} height={h} radius={16} />
      ))}
    </Pulse>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function ServiceEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const servicesQuery = useServices()
  const updateServiceMutation = useUpdateService(id ?? '')
  const deleteServiceMutation = useDeleteService()

  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState(30)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)

  const insets = useSafeAreaInsets()

  const service = servicesQuery.data?.find(s => s.id === id) ?? null
  const loadState: LoadState = service
    ? 'ready'
    : servicesQuery.isLoading
      ? 'loading'
      : 'error'

  // Populate the form once per service — background refetches must not
  // overwrite what the user is editing.
  const initializedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!service || initializedForRef.current === service.id) return
    initializedForRef.current = service.id
    setName(service.name)
    setDurationMin(service.durationMin)
    setPrice(String(service.price))
    setDescription(service.description ?? '')
  }, [service])

  const saving = updateServiceMutation.isPending
  const deleting = deleteServiceMutation.isPending
  const load = () => { servicesQuery.refetch() }

  async function handleSave() {
    const parsed = validate(serviceFormSchema, {
      name: name.trim(),
      durationMin,
      price: parseFloat(price) || 0,
      description: description.trim() || undefined,
    })
    if (!parsed.ok) { Alert.alert('', parsed.error); return }
    try {
      await updateServiceMutation.mutateAsync(parsed.data)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch {
      Alert.alert('Error', 'No se pudo guardar el servicio')
    }
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
            try {
              await deleteServiceMutation.mutateAsync(id!)
              router.back()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el servicio')
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

      {loadState === 'loading' && <ScrollView><ServiceSkeleton /></ScrollView>}

      {loadState === 'error' && (
        <ErrorState message="No se pudo cargar el servicio" onRetry={load} />
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
})
