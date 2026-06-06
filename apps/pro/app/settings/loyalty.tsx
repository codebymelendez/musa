import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Animated, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  getLoyaltyProgram, saveLoyaltyProgram, getLoyaltyAccounts,
  type LoyaltyProgram,
} from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF } from '../../lib/utils'

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
    <Animated.View style={{ opacity: op, paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
      {[220, 180, 100].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

// ─── stat bento ───────────────────────────────────────────────────────────────

function StatBento({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { fontFamily: MONO }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'
type AccType = 'visits' | 'points'

export default function LoyaltyScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')

  // program config form state
  const [isActive, setIsActive] = useState(false)
  const [accumulationType, setAccumulationType] = useState<AccType>('visits')
  const [pointsPerVisit, setPointsPerVisit] = useState('1')
  const [rewardThreshold, setRewardThreshold] = useState('10')
  const [rewardDescription, setRewardDescription] = useState('')

  // stats (from accounts list)
  const [statsClientsWithPoints, setStatsClientsWithPoints] = useState(0)
  const [statsTotalPoints, setStatsTotalPoints] = useState(0)

  // save state
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const [program, accounts] = await Promise.all([
        getLoyaltyProgram(),
        getLoyaltyAccounts(),
      ])

      // hydrate form
      if (program) {
        setIsActive(program.isActive)
        setAccumulationType(program.accumulationType)
        setPointsPerVisit(String(program.pointsPerVisit))
        setRewardThreshold(String(program.rewardThreshold))
        setRewardDescription(program.rewardDescription ?? '')
      }

      // compute stats client-side
      const withPoints = accounts.filter(a => a.totalPoints > 0)
      setStatsClientsWithPoints(withPoints.length)
      setStatsTotalPoints(withPoints.reduce((sum, a) => sum + a.totalPoints, 0))

      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    const threshold = parseInt(rewardThreshold, 10)
    const perVisit = parseInt(pointsPerVisit, 10)
    if (!rewardDescription.trim()) {
      Alert.alert('', 'Describe el premio para las clientas'); return
    }
    if (isNaN(threshold) || threshold < 1) {
      Alert.alert('', 'El umbral de canje debe ser al menos 1 punto'); return
    }
    if (isNaN(perVisit) || perVisit < 1) {
      Alert.alert('', 'Los puntos por visita deben ser al menos 1'); return
    }

    setSaving(true)
    try {
      await saveLoyaltyProgram({
        isActive,
        accumulationType,
        pointsPerVisit: perVisit,
        rewardThreshold: threshold,
        rewardDescription: rewardDescription.trim(),
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      Alert.alert('Error al guardar', msg)
    } finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Programa de Fidelidad</Text>
        <View style={styles.backBtn} />
      </View>

      {loadState === 'loading' && <ScrollView><Skeleton /></ScrollView>}

      {loadState === 'error' && (
        <View style={styles.center}>
          <Text style={styles.grayText}>No se pudo cargar la configuración</Text>
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
            {/* ─── Configuración del programa ─── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Configuración del programa</Text>

              {/* Toggle principal */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Activar programa de puntos</Text>
                  <Text style={styles.toggleSub}>
                    Las clientas acumularán puntos con cada cita completada
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#DDDDDD', true: PRIMARY }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.divider} />

              {/* Tipo de acumulación */}
              <Text style={styles.label}>Tipo de programa</Text>
              <View style={styles.typeRow}>
                {([
                  { key: 'visits' as AccType, label: 'Por visitas', icon: 'calendar-outline' as const },
                  { key: 'points' as AccType, label: 'Por monto gastado', icon: 'cash-outline' as const },
                ] as { key: AccType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[]).map(opt => {
                  const active = accumulationType === opt.key
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.typeOption, active && styles.typeOptionActive]}
                      onPress={() => setAccumulationType(opt.key)}
                      activeOpacity={0.78}
                    >
                      <Ionicons name={opt.icon} size={18}
                        color={active ? PRIMARY : GRAY} />
                      <Text style={[styles.typeOptionText, active && { color: PRIMARY }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Puntos por visita / por $ */}
              <Text style={[styles.label, { marginTop: 16 }]}>
                {accumulationType === 'visits'
                  ? 'Puntos por visita completada'
                  : 'Puntos por cada $1 gastado'}
              </Text>
              <TextInput
                style={styles.input}
                value={pointsPerVisit}
                onChangeText={setPointsPerVisit}
                keyboardType="number-pad"
                placeholderTextColor="#AAAAAA"
                placeholder="1"
              />

              {/* Umbral de canje */}
              <Text style={[styles.label, { marginTop: 16 }]}>
                Canjear premio cada X puntos
              </Text>
              <TextInput
                style={styles.input}
                value={rewardThreshold}
                onChangeText={setRewardThreshold}
                keyboardType="number-pad"
                placeholderTextColor="#AAAAAA"
                placeholder="10"
              />

              {/* Descripción del premio */}
              <Text style={[styles.label, { marginTop: 16 }]}>
                Descripción del premio
              </Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                value={rewardDescription}
                onChangeText={setRewardDescription}
                multiline
                placeholderTextColor="#AAAAAA"
                placeholder="ej: Servicio gratis, 20% de descuento"
              />
            </View>

            {/* ─── Estadísticas del programa ─── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Estadísticas</Text>
              <View style={styles.statsRow}>
                <StatBento label="clientas con puntos" value={statsClientsWithPoints} />
                <View style={styles.statsDivider} />
                <StatBento label="puntos activos totales" value={statsTotalPoints} />
              </View>
            </View>

            {/* ─── Cómo funciona ─── */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={GRAY} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
                <Text style={styles.infoText}>
                  {accumulationType === 'visits'
                    ? `Cada vez que una clienta completa una cita, gana ${pointsPerVisit || '1'} punto${parseInt(pointsPerVisit, 10) !== 1 ? 's' : ''} automáticamente.`
                    : `La clienta gana ${pointsPerVisit || '1'} punto${parseInt(pointsPerVisit, 10) !== 1 ? 's' : ''} por cada $1 que paga en su cita.`
                  }
                  {` Al acumular ${rewardThreshold || '10'} puntos puede canjear: ${rewardDescription || '(configura el premio arriba)'}.`}
                </Text>
                <Text style={styles.infoHint}>
                  Los puntos se otorgan automáticamente al completar una cita.
                  Puedes registrar canjes desde la ficha de cada clienta.
                </Text>
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* ─── Bottom CTA ─── */}
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
                <Text style={styles.btnPrimaryText}>
                  {saving ? 'Guardando…' : 'Guardar configuración'}
                </Text>
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
  headerTitle: { fontFamily: SERIF, fontSize: 20, color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  toggleTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 4 },
  toggleSub: { fontSize: 13, color: GRAY, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 18 },
  label: { fontSize: 12, color: GRAY, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  typeOptionActive: { borderColor: PRIMARY, backgroundColor: '#FDF0EC' },
  typeOptionText: { flex: 1, fontSize: 13, fontWeight: '500', color: GRAY },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  // stats
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statValue: { fontSize: 28, fontWeight: '500', color: DARK, marginBottom: 4 },
  statLabel: { fontSize: 11, color: GRAY, textAlign: 'center' },
  statsDivider: { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 4 },
  // info card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
  },
  infoTitle: { fontSize: 14, fontWeight: '500', color: DARK },
  infoText: { fontSize: 13, color: DARK, lineHeight: 20 },
  infoHint: { fontSize: 12, color: GRAY, lineHeight: 18 },
  // bottom
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
  },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  savedText: { fontSize: 16, fontWeight: '500', color: '#2E7D32' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})
