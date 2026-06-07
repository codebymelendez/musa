import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Animated, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { getPromotions, updatePromotion, deletePromotion, type PromotionItem } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF } from '../../lib/utils'
import DatePickerModal, { formatDateSpanish } from '../../components/DatePickerModal'

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
      {[160, 120, 80].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function PromotionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [promo, setPromo] = useState<PromotionItem | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState('')
  const [validFrom, setValidFrom] = useState<string | null>(null)
  const [validUntil, setValidUntil] = useState<string | null>(null)
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showUntilPicker, setShowUntilPicker] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const all = await getPromotions()
      const found = all.find(p => p.id === id)
      if (!found) { setLoadState('error'); return }
      setPromo(found)
      setTitle(found.title)
      setDescription(found.description ?? '')
      setDiscount(String(found.discount))
      setValidFrom(found.validFrom ? found.validFrom.split('T')[0] : null)
      setValidUntil(found.validUntil ? found.validUntil.split('T')[0] : null)
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!title.trim()) { Alert.alert('', 'El título es requerido'); return }
    setSaving(true)
    try {
      await updatePromotion(id!, {
        title: title.trim(),
        description: description.trim() || undefined,
        discount: parseFloat(discount) || 0,
        validFrom: validFrom ? `${validFrom}T00:00:00` : undefined,
        validUntil: validUntil ? `${validUntil}T23:59:59` : undefined,
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch {
      Alert.alert('Error', 'No se pudo guardar la promoción')
    } finally { setSaving(false) }
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
            setDeleting(true)
            try {
              await deletePromotion(id!)
              router.back()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la promoción')
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
        <Text style={styles.headerTitle} numberOfLines={1}>{promo?.title ?? 'Promoción'}</Text>
        <View style={styles.backBtn} />
      </View>

      {loadState === 'loading' && <ScrollView><Skeleton /></ScrollView>}

      {loadState === 'error' && (
        <View style={styles.center}>
          <Text style={styles.grayText}>No se pudo cargar la promoción</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})
