import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Animated, RefreshControl,
  Share, Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getSettings, getServices, updateSettings, type SettingsData, type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, BORDER, GRAY, MONO, SERIF, SURFACE, initials, formatMoney, hhmmToDisplay } from '../../lib/utils'

const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app').replace(/\/$/, '')

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
      {[180, 140, 120, 200].map((h, i) => (
        <View key={i} style={[styles.skeletonBlock, { height: h }]} />
      ))}
    </Animated.View>
  )
}

// ─── nav row ─────────────────────────────────────────────────────────────────

function NavRow({
  icon, label, onPress,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.navRowIcon}>
        <Ionicons name={icon} size={20} color={DARK} />
      </View>
      <Text style={styles.navRowLabel}>{label}</Text>
      <Ionicons name="chevron-forward-outline" size={16} color="#BBBBBB" />
    </TouchableOpacity>
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
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const [data, svcs] = await Promise.all([getSettings(), getServices()])
      if (!data) { setLoadState('error'); return }
      setProfile(data)
      setName(data.name ?? '')
      setBusinessName(data.business?.name ?? '')
      setWhatsapp(data.business?.whatsapp ?? '')
      setInstagram(data.business?.instagram ?? '')
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
      await updateSettings({ name, businessName, businessWhatsapp: whatsapp, businessInstagram: instagram })
      setSavedMsg(true)
      setDirty(false)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch { /* silently fail */ }
    finally { setSaving(false) }
  }

  function handleSignOut() {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás segura de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión', style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  async function handleCopy() {
    if (!profile) return
    const link = `${APP_URL}/p/${profile.slug}`
    await Clipboard.setStringAsync(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (!profile) return
    const link = `${APP_URL}/p/${profile.slug}`
    await Share.share({ message: `Reserva tu cita en ${link}`, url: link })
  }

  function availabilitySummary(): string {
    const s = profile?.settings
    if (!s) return 'No configurado'
    const dayNames = ['D','L','M','X','J','V','S']
    const days = s.workDays.map(d => dayNames[d]).join('-')
    return `${days}, ${hhmmToDisplay(s.startHour)} - ${hhmmToDisplay(s.endHour)}`
  }

  const bookingLink = profile ? `${APP_URL}/p/${profile.slug}` : ''
  const isOwner = profile?.appRole === 'owner' || profile?.appRole === 'OWNER'

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
            <Text style={styles.heroName}>{profile.name}</Text>
            {profile.business?.name ? (
              <Text style={styles.heroBusinessName}>{profile.business.name}</Text>
            ) : null}
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
          </View>

          {/* Canales de contacto */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Canales de contacto</Text>

            <Text style={styles.fieldLabel}>WhatsApp</Text>
            <View style={styles.prefixInput}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={{ marginLeft: 12 }} />
              <Text style={styles.prefix}>+58</Text>
              <TextInput
                style={styles.prefixField}
                value={whatsapp}
                onChangeText={v => { setWhatsapp(v); setDirty(true) }}
                keyboardType="phone-pad"
                placeholderTextColor="#AAAAAA"
                placeholder="4141234567"
              />
            </View>

            <Text style={styles.fieldLabel}>Instagram</Text>
            <View style={styles.prefixInput}>
              <Ionicons name="logo-instagram" size={18} color="#E1306C" style={{ marginLeft: 12 }} />
              <Text style={styles.prefix}>@</Text>
              <TextInput
                style={styles.prefixField}
                value={instagram}
                onChangeText={v => { setInstagram(v); setDirty(true) }}
                autoCapitalize="none"
                placeholderTextColor="#AAAAAA"
                placeholder="tu_negocio"
              />
            </View>
          </View>

          {/* Mi horario */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Mi horario</Text>
              <TouchableOpacity
                onPress={() => router.push('/settings/availability' as Parameters<typeof router.push>[0])}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>Editar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.availSummary}>{availabilitySummary()}</Text>
          </View>

          {/* Enlace de reserva */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enlace de reserva</Text>
            <View style={styles.linkBox}>
              <Text style={[styles.linkUrl, { fontFamily: MONO }]} numberOfLines={1}>
                {bookingLink}
              </Text>
            </View>
            <View style={styles.linkActions}>
              <TouchableOpacity style={styles.linkActionBtn} onPress={handleCopy} activeOpacity={0.8}>
                <Ionicons name={copied ? 'checkmark-outline' : 'copy-outline'} size={16}
                  color={copied ? '#2E7D32' : DARK} />
                <Text style={[styles.linkActionText, copied && { color: '#2E7D32' }]}>
                  {copied ? '¡Copiado!' : 'Copiar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkActionBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={16} color={DARK} />
                <Text style={styles.linkActionText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Services preview */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Servicios</Text>
              <TouchableOpacity
                onPress={() => router.push('/services' as Parameters<typeof router.push>[0])}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>Gestionar</Text>
              </TouchableOpacity>
            </View>
            {services.length === 0 ? (
              <Text style={styles.grayText}>Sin servicios configurados</Text>
            ) : (
              services.slice(0, 3).map(svc => (
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
            {services.length > 3 && (
              <Text style={[styles.grayText, { marginTop: 8, fontSize: 13 }]}>
                +{services.length - 3} más
              </Text>
            )}
          </View>

          {/* Gestión — solo OWNER */}
          {isOwner && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gestión</Text>
              <NavRow icon="cut-outline" label="Mis Servicios"
                onPress={() => router.push('/services' as Parameters<typeof router.push>[0])} />
              <View style={styles.navDivider} />
              <NavRow icon="pricetag-outline" label="Promociones"
                onPress={() => router.push('/promotions' as Parameters<typeof router.push>[0])} />
              <View style={styles.navDivider} />
              <NavRow icon="people-outline" label="Mi Equipo"
                onPress={() => router.push('/team' as Parameters<typeof router.push>[0])} />
              <View style={styles.navDivider} />
              <NavRow icon="star-outline" label="Programa de Fidelidad"
                onPress={() => router.push('/settings/loyalty' as Parameters<typeof router.push>[0])} />
              <View style={styles.navDivider} />
              <NavRow icon="settings-outline" label="Ajustes del negocio"
                onPress={() => router.push('/settings' as Parameters<typeof router.push>[0])} />
            </View>
          )}

          {/* Account */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
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
  safe: { flex: 1, backgroundColor: SURFACE },
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
    marginBottom: 12,
  },
  avatarLgText: { fontSize: 28, fontWeight: '500', color: PRIMARY },
  heroName: { fontSize: 20, fontWeight: '500', color: DARK, marginBottom: 2 },
  heroBusinessName: { fontSize: 14, color: GRAY },
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
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  fieldReadonly: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#F0EDE9',
    paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#F5F3F0',
  },
  fieldReadonlyText: { fontSize: 15, color: GRAY },
  prefixInput: {
    flexDirection: 'row', alignItems: 'center',
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE, marginBottom: 2,
  },
  prefix: { paddingHorizontal: 8, fontSize: 15, color: GRAY },
  prefixField: { flex: 1, fontSize: 15, color: DARK, paddingRight: 14, height: '100%' },
  availSummary: { fontSize: 15, color: DARK, fontWeight: '500' },
  linkBox: {
    padding: 12, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    marginBottom: 12,
  },
  linkUrl: { fontSize: 13, color: DARK },
  linkActions: { flexDirection: 'row', gap: 10 },
  linkActionBtn: {
    flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  linkActionText: { fontSize: 13, fontWeight: '500', color: DARK },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  svcLeft: { flex: 1 },
  svcName: { fontSize: 14, fontWeight: '500', color: DARK },
  svcDuration: { fontSize: 12, color: GRAY, marginTop: 2 },
  svcPrice: { fontSize: 14, color: DARK },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, height: 52,
  },
  navRowIcon: { width: 36, alignItems: 'center' },
  navRowLabel: { flex: 1, fontSize: 15, color: DARK },
  navDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 50 },
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
