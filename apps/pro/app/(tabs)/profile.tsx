import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Animated, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getSettings, getServices, updateSettings, type SettingsData, type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, initials, formatMoney } from '../../lib/utils'

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
    <Animated.View style={{ opacity, paddingHorizontal: 20, paddingTop: 24 }}>
      <View style={styles.skeletonHero} />
      {[180, 140].map((h, i) => (
        <View key={i} style={[styles.skeletonBlock, { height: h }]} />
      ))}
    </Animated.View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'

export default function ProfileScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<SettingsData | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const [data, svcs] = await Promise.all([getSettings(), getServices()])
      if (!data) { setLoadState('error'); return }
      setProfile(data)
      setName(data.name ?? '')
      setBusinessName(data.business?.name ?? '')
      setServices(svcs)
      setDirty(false)
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function save() {
    setSaving(true)
    try {
      await updateSettings({ name, businessName })
      setSavedMsg(true)
      setDirty(false)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch { /* silently fail */ }
    finally { setSaving(false) }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      {loadState === 'loading' && <ScrollView><Skeleton /></ScrollView>}

      {loadState === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.grayText}>No se pudo cargar el perfil</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && profile && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {/* Avatar hero */}
          <View style={styles.heroSection}>
            <View style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initials(profile.name)}</Text>
            </View>
          </View>

          {/* Info editable */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información</Text>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={v => { setName(v); setDirty(true) }}
              placeholderTextColor="#AAAAAA"
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldReadonly}>
              <Text style={styles.fieldReadonlyText}>{profile.email}</Text>
            </View>

            <Text style={styles.fieldLabel}>Nombre del negocio</Text>
            <TextInput
              style={styles.fieldInput}
              value={businessName}
              onChangeText={v => { setBusinessName(v); setDirty(true) }}
              placeholderTextColor="#AAAAAA"
            />

            <Text style={styles.fieldLabel}>Perfil público</Text>
            <View style={styles.fieldReadonly}>
              <Text style={styles.fieldReadonlyText} numberOfLines={1}>
                {appUrl}/p/{profile.slug}
              </Text>
            </View>
          </View>

          {/* Services */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Servicios</Text>
              <TouchableOpacity
                onPress={() => router.push('/settings/services' as Parameters<typeof router.push>[0])}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>Gestionar</Text>
              </TouchableOpacity>
            </View>

            {services.length === 0 ? (
              <Text style={styles.grayText}>Sin servicios configurados</Text>
            ) : (
              services.map(svc => (
                <View key={svc.id} style={styles.svcRow}>
                  <View style={styles.svcLeft}>
                    <Text style={styles.svcName}>{svc.name}</Text>
                    <Text style={styles.svcDuration}>{svc.durationMin} min</Text>
                  </View>
                  <Text style={[styles.svcPrice, { fontFamily: MONO }]}>
                    {formatMoney(svc.price, svc.currency)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Account */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color="#C0392B" />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Save / saved feedback */}
          {(dirty || savedMsg) && (
            <View style={styles.saveRow}>
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
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnPrimaryText}>Guardar cambios</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: SERIF, fontSize: 28, color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 24 },
  avatarLg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  avatarLgText: { fontSize: 28, fontWeight: '500', color: PRIMARY },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  linkText: { fontSize: 14, color: PRIMARY },
  fieldLabel: { fontSize: 12, color: GRAY, marginBottom: 6, marginTop: 12 },
  fieldInput: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: '#FAFAF9',
  },
  fieldReadonly: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#F0EDE9',
    paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#F5F3F0',
  },
  fieldReadonlyText: { fontSize: 15, color: GRAY },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  svcLeft: { flex: 1 },
  svcName: { fontSize: 14, fontWeight: '500', color: DARK },
  svcDuration: { fontSize: 12, color: GRAY, marginTop: 2 },
  svcPrice: { fontSize: 14, color: DARK },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 48, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#C0392B', paddingHorizontal: 16,
  },
  signOutText: { fontSize: 15, fontWeight: '500', color: '#C0392B' },
  saveRow: { marginTop: 4 },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  savedText: { fontSize: 16, fontWeight: '500', color: '#2E7D32' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  skeletonHero: { height: 80, width: 80, borderRadius: 40, backgroundColor: '#F0EDE9', alignSelf: 'center', marginBottom: 24 },
  skeletonBlock: { backgroundColor: '#F0EDE9', borderRadius: 16, marginBottom: 14 },
})
