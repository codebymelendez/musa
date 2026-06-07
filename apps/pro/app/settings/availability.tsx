import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getSettings, updateSettings } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, SERIF, hhmmToParts, partsToHhmm, hhmmToDisplay } from '../../lib/utils'

// Days in display order L M X J V S D → index in [0-6] (0=Sunday)
const DAYS = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 0 },
]

const SLOT_OPTIONS = [15, 30, 45, 60, 90]

const TIMEZONE_OPTIONS = [
  { label: 'Venezuela',  value: 'America/Caracas' },
  { label: 'Colombia',   value: 'America/Bogota' },
  { label: 'Perú',       value: 'America/Lima' },
  { label: 'México',     value: 'America/Mexico_City' },
  { label: 'Argentina',  value: 'America/Argentina/Buenos_Aires' },
  { label: 'España',     value: 'Europe/Madrid' },
  { label: 'UTC',        value: 'UTC' },
]

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
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
    <Animated.View style={{ opacity, gap: 16, paddingHorizontal: 20, paddingTop: 24 }}>
      {[120, 200, 160].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

// ─── time input ───────────────────────────────────────────────────────────────

function TimeInput({
  label, hhmm, onChange,
}: { label: string; hhmm: number; onChange: (v: number) => void }) {
  const parts = hhmmToParts(hhmm)
  const [h, setH] = useState(parts.h)
  const [m, setM] = useState(parts.m)

  function commit(newH: string, newM: string) {
    const hv = Math.min(23, Math.max(0, parseInt(newH, 10) || 0))
    const mv = Math.min(59, Math.max(0, parseInt(newM, 10) || 0))
    const mv5 = Math.round(mv / 5) * 5
    setH(String(hv).padStart(2, '0'))
    setM(String(mv5).padStart(2, '0'))
    onChange(partsToHhmm(String(hv), String(mv5)))
  }

  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <TextInput
          style={styles.timeInput}
          value={h}
          onChangeText={setH}
          onBlur={() => commit(h, m)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
        <Text style={styles.timeSep}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={m}
          onChangeText={setM}
          onBlur={() => commit(h, m)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
      </View>
    </View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'

export default function AvailabilityScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startHour, setStartHour] = useState(800)
  const [endHour, setEndHour] = useState(1700)
  const [slotDuration, setSlotDuration] = useState(30)
  const [timezone, setTimezone] = useState('America/Caracas')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const data = await getSettings()
      if (!data) { setLoadState('error'); return }
      const s = data.settings
      if (s) {
        setWorkDays(s.workDays ?? [1, 2, 3, 4, 5])
        setStartHour(s.startHour ?? 800)
        setEndHour(s.endHour ?? 1700)
        setSlotDuration(s.slotDuration ?? 30)
        setTimezone(s.timezone ?? 'America/Caracas')
      }
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  function toggleDay(val: number) {
    setWorkDays(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    )
  }

  async function save() {
    setSaving(true)
    try {
      await updateSettings({ settings: { workDays, startHour, endHour, slotDuration, timezone } })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch { /* silently fail */ }
    finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disponibilidad</Text>
        <View style={styles.backBtn} />
      </View>

      {loadState === 'loading' && <Skeleton />}

      {loadState === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.grayText}>No se pudo cargar la configuración</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Work days */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Días laborables</Text>
              <View style={styles.pillsRow}>
                {DAYS.map(({ label, value }) => {
                  const active = workDays.includes(value)
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.dayPill, active && styles.dayPillActive]}
                      onPress={() => toggleDay(value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Hours */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Horario</Text>
              <View style={styles.hoursRow}>
                <TimeInput label="Apertura" hhmm={startHour} onChange={setStartHour} />
                <Text style={styles.hoursDash}>—</Text>
                <TimeInput label="Cierre" hhmm={endHour} onChange={setEndHour} />
              </View>
            </View>

            {/* Slot duration */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Duración de slots</Text>
              <View style={styles.pillsRow}>
                {SLOT_OPTIONS.map(min => {
                  const active = slotDuration === min
                  return (
                    <TouchableOpacity
                      key={min}
                      style={[styles.slotPill, active && styles.dayPillActive]}
                      onPress={() => setSlotDuration(min)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {min} min
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Timezone */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Zona horaria</Text>
              <View style={styles.pillsRow}>
                {TIMEZONE_OPTIONS.map(({ label, value }) => {
                  const active = timezone === value
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.tzPill, active && styles.dayPillActive]}
                      onPress={() => setTimezone(value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Fixed bottom button */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            {savedMsg ? (
              <View style={styles.savedBadge}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D32" />
                <Text style={styles.savedText}>Guardado ✓</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '500', color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 16 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayPill: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  dayPillActive: { backgroundColor: PRIMARY },
  dayPillText: { fontSize: 13, fontWeight: '500', color: '#666666' },
  dayPillTextActive: { color: '#fff' },
  slotPill: {
    paddingHorizontal: 16, height: 36, borderRadius: 18,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  tzPill: {
    paddingHorizontal: 14, height: 36, borderRadius: 18,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursDash: { fontSize: 20, color: GRAY, marginTop: 18 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 12, color: GRAY, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: {
    width: 52, height: 48, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, backgroundColor: '#F5F3F0',
    fontSize: 18, fontWeight: '500', color: DARK,
    textAlign: 'center',
  },
  timeSep: { fontSize: 22, fontWeight: '500', color: DARK },
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#FAFAF9' },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  savedText: { fontSize: 16, fontWeight: '500', color: '#2E7D32' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 15, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})
