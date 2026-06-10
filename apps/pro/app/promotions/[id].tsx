import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF } from '../../lib/utils'
import DatePickerModal, { formatDateSpanish } from '../../components/DatePickerModal'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import { validate, promotionFormSchema } from '../../lib/validation'
import { usePromotions, useUpdatePromotion, useDeletePromotion } from '../../hooks/queries'

function formatDisplayDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function parseDisplayDate(str: string): string | null {
  const parts = str.replace(/\D/g, '').slice(0, 8)
  if (parts.length < 8) return null
  const d = parts.slice(0, 2); const m = parts.slice(2, 4); const y = parts.slice(4, 8)
  const date = new Date(`${y}-${m}-${d}T00:00:00`)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function PromotionSkeleton() {
  return (
    <Pulse style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
      {[160, 120, 80].map((h, i) => (
        <Bone key={i} height={h} radius={16} />
      ))}
    </Pulse>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function PromotionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const promotionsQuery = usePromotions()
  const updatePromotionMutation = useUpdatePromotion(id ?? '')
  const deletePromotionMutation = useDeletePromotion()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState('')
  const [validFrom, setValidFrom] = useState<string | null>(null)
  const [validUntil, setValidUntil] = useState<string | null>(null)
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showUntilPicker, setShowUntilPicker] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const insets = useSafeAreaInsets()

  const promo = promotionsQuery.data?.find(p => p.id === id) ?? null
  const loadState: LoadState = promo
    ? 'ready'
    : promotionsQuery.isLoading
      ? 'loading'
      : 'error'

  // Populate the form once per promotion — background refetches must not
  // overwrite what the user is editing.
  const initializedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!promo || initializedForRef.current === promo.id) return
    initializedForRef.current = promo.id
    setTitle(promo.title)
    setDescription(promo.description ?? '')
    setDiscount(String(promo.discount))
    setValidFrom(promo.validFrom ? promo.validFrom.split('T')[0] : null)
    setValidUntil(promo.validUntil ? promo.validUntil.split('T')[0] : null)
  }, [promo])

  const saving = updatePromotionMutation.isPending
  const deleting = deletePromotionMutation.isPending
  const load = () => { promotionsQuery.refetch() }

  async function handleSave() {
    const parsed = validate(promotionFormSchema, {
      title: title.trim(),
      description: description.trim() || undefined,
      discount: parseFloat(discount) || 0,
      validFrom: validFrom ?? undefined,
      validUntil: validUntil ?? undefined,
    })
    if (!parsed.ok) { Alert.alert('', parsed.error); return }
    try {
      await updatePromotionMutation.mutateAsync({
        ...parsed.data,
        validFrom: parsed.data.validFrom ? `${parsed.data.validFrom}T00:00:00` : undefined,
        validUntil: parsed.data.validUntil ? `${parsed.data.validUntil}T23:59:59` : undefined,
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch {
      Alert.alert('Error', 'No se pudo guardar la promoción')
    }
  }

  function handleDelete() {
    Alert.alert(
      'Eliminar promoción',
      `¿Eliminar "${title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await deletePromotionMutation.mutateAsync(id!)
              router.back()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la promoción')
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
        <Text style={styles.headerTitle} numberOfLines={1}>{promo?.title ?? 'Promoción'}</Text>
        <View style={styles.backBtn} />
      </View>

      {loadState === 'loading' && <ScrollView><PromotionSkeleton /></ScrollView>}

      {loadState === 'error' && (
        <ErrorState message="No se pudo cargar la promoción" onRetry={load} />
      )}

      {loadState === 'ready' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detalles de la promoción</Text>

              <Text style={styles.label}>Título *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle}
                placeholderTextColor="#AAAAAA" />

              <Text style={[styles.label, { marginTop: 14 }]}>Descripción <Text style={{ color: GRAY }}>(opcional)</Text></Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={description} onChangeText={setDescription} multiline
                placeholderTextColor="#AAAAAA" />

              <Text style={[styles.label, { marginTop: 14 }]}>Descuento %</Text>
              <TextInput style={styles.input} value={discount} onChangeText={setDiscount}
                keyboardType="decimal-pad" placeholderTextColor="#AAAAAA" />

              <View style={styles.datesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fecha inicio</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowFromPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color={PRIMARY} />
                    <Text style={[styles.dateBtnText, !validFrom && { color: '#AAAAAA' }]} numberOfLines={1}>
                      {validFrom ? formatDateSpanish(validFrom) : 'Sin fecha'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fecha fin</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowUntilPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color={PRIMARY} />
                    <Text style={[styles.dateBtnText, !validUntil && { color: '#AAAAAA' }]} numberOfLines={1}>
                      {validUntil ? formatDateSpanish(validUntil) : 'Sin fecha'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>

            <TouchableOpacity
              style={styles.deleteBtn} onPress={handleDelete} disabled={deleting} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color="#C62828" />
              <Text style={styles.deleteBtnText}>{deleting ? 'Eliminando…' : 'Eliminar promoción'}</Text>
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
                onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      <DatePickerModal
        visible={showFromPicker}
        value={validFrom}
        onConfirm={date => { setValidFrom(date); setShowFromPicker(false) }}
        onCancel={() => setShowFromPicker(false)}
        title="Fecha de inicio"
        minDate={today}
      />
      <DatePickerModal
        visible={showUntilPicker}
        value={validUntil}
        onConfirm={date => { setValidUntil(date); setShowUntilPicker(false) }}
        onCancel={() => setShowUntilPicker(false)}
        title="Fecha de fin"
        minDate={validFrom ?? today}
      />
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
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
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
  datesRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 10, backgroundColor: SURFACE,
  },
  dateBtnText: { flex: 1, fontSize: 13, color: DARK },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  toggleLabel: { fontSize: 15, color: DARK, fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#C62828',
    paddingHorizontal: 20, justifyContent: 'center', marginBottom: 8,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '500', color: '#C62828' },
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: SURFACE },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  savedText: { fontSize: 16, fontWeight: '500', color: '#2E7D32' },
})
