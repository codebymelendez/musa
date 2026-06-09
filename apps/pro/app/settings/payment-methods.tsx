import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Animated, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getSettings, updateSettings } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF } from '../../lib/utils'

type Method = {
  key: string
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  hint?: string
}

const METHODS: Method[] = [
  { key: 'efectivo_usd',  label: 'Efectivo USD',           icon: 'cash-outline',                hint: 'Billetes dólares'   },
  { key: 'efectivo_bs',   label: 'Efectivo Bs.',           icon: 'cash-outline',                hint: 'Billetes bolívares' },
  { key: 'pago_movil',    label: 'Pago Móvil',             icon: 'phone-portrait-outline',      hint: 'Venezuela'          },
  { key: 'zelle',         label: 'Zelle',                  icon: 'repeat-outline',              hint: 'USD digital'        },
  { key: 'transferencia', label: 'Transferencia Bancaria', icon: 'swap-horizontal-outline'                                 },
  { key: 'otro',          label: 'Otro',                   icon: 'ellipsis-horizontal-outline'                             },
]

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
      <View style={{ height: 60, backgroundColor: '#F0EDE9', borderRadius: 14 }} />
      <View style={{ height: 280, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
    </Animated.View>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function PaymentMethodsScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [active, setActive] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const data = await getSettings()
      if (!data) { setLoadState('error'); return }
      setActive(data.settings?.paymentMethods ?? [])
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(key: string, newVal: boolean) {
    const prev = active
    const next = newVal ? [...active, key] : active.filter(k => k !== key)
    setActive(next)
    setSaving(key)
    try {
      await updateSettings({ settings: { paymentMethods: next } })
    } catch {
      setActive(prev)
      Alert.alert('Error', 'No se pudo guardar el cambio')
    } finally { setSaving(null) }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
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
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.descCard}>
            <Ionicons name="information-circle-outline" size={16} color={GRAY} />
            <Text style={styles.descText}>
              Activa los métodos que aceptas. Tus clientas los verán en tu perfil de reserva.
            </Text>
          </View>

          <View style={styles.card}>
            {METHODS.map((method, idx) => {
              const isActive = active.includes(method.key)
              const isSaving = saving === method.key
              return (
                <View key={method.key}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                      <Ionicons
                        name={method.icon}
                        size={20}
                        color={isActive ? PRIMARY : DARK}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{method.label}</Text>
                      {method.hint && (
                        <Text style={styles.rowHint}>{method.hint}</Text>
                      )}
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={val => { if (!isSaving) handleToggle(method.key, val) }}
                      trackColor={{ false: '#DDDDDD', true: PRIMARY }}
                      thumbColor="#fff"
                      disabled={isSaving}
                    />
                  </View>
                </View>
              )
            })}
          </View>

          {active.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Activos ahora</Text>
              <View style={styles.pillsWrap}>
                {active.map(key => (
                  <View key={key} style={styles.pill}>
                    <Text style={styles.pillText}>{key}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
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
  content: { paddingHorizontal: 20, paddingTop: 20 },
  descCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#F5F0EB', borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  descText: { flex: 1, fontSize: 13, color: GRAY, lineHeight: 19 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, overflow: 'hidden', marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 64,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 60, paddingHorizontal: 16,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: '#FDF0EC' },
  rowLabel: { fontSize: 15, fontWeight: '500', color: DARK },
  rowHint: { fontSize: 11, color: GRAY, marginTop: 1 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 16,
  },
  summaryTitle: {
    fontSize: 11, fontWeight: '600', color: GRAY,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: '#FDF0EC', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#F5D8CE',
  },
  pillText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})
