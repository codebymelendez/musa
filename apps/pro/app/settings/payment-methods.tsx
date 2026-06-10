import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF, normalizePaymentMethods, type CanonicalPaymentMethod } from '../../lib/utils'
import { Pulse, Bone } from '../../components/ui/Skeleton'
import ErrorState from '../../components/ui/ErrorState'
import { useSettings, useUpdateSettings } from '../../hooks/queries'
import { MaxWidthContainer } from '../../components/ui/MaxWidthContainer'

type Method = {
  key: CanonicalPaymentMethod
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

function PaymentMethodsSkeleton() {
  return (
    <Pulse style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
      <Bone height={60} radius={14} />
      <Bone height={280} radius={16} />
    </Pulse>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function PaymentMethodsScreen() {
  const settingsQuery = useSettings()
  const updateSettingsMutation = useUpdateSettings()
  const [saving, setSaving] = useState<string | null>(null)
  const insets = useSafeAreaInsets()

  const data = settingsQuery.data ?? null
  const loadState: LoadState = data
    ? 'ready'
    : settingsQuery.isLoading
      ? 'loading'
      : 'error'

  // The settings query is the source of truth; the mutation updates it
  // optimistically and rolls back on error.
  // Lectura defensiva: la BD puede traer valores legacy ("Efectivo", "Pago
  // Móvil") duplicados con las keys canónicas — mapear + deduplicar siempre.
  const active = normalizePaymentMethods(data?.settings?.paymentMethods ?? [])

  const load = () => { settingsQuery.refetch() }

  async function handleToggle(key: string, newVal: boolean) {
    // active ya es canónico y deduplicado → se persiste solo formato canónico
    const next = newVal ? [...active, key] : active.filter(k => k !== key)
    setSaving(key)
    try {
      await updateSettingsMutation.mutateAsync({ settings: { paymentMethods: next } })
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cambio')
    } finally { setSaving(null) }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MaxWidthContainer>
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

        {loadState === 'loading' && <ScrollView><PaymentMethodsSkeleton /></ScrollView>}

        {loadState === 'error' && (
          <ErrorState message="No se pudo cargar la configuración" onRetry={load} />
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
                      <Text style={styles.pillText}>
                        {METHODS.find(m => m.key === key)?.label ?? key}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </MaxWidthContainer>
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
})
