import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Modal, KeyboardAvoidingView,
  Platform, Share, Linking, Alert, Switch, ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getSettings, updateSettings, type SettingsData } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, initials, hhmmToDisplay } from '../../lib/utils'

const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app').replace(/\/$/, '')

// ─── helper ───────────────────────────────────────────────────────────────────

function availSummary(settings: SettingsData['settings'] | null): string {
  if (!settings) return 'No configurado'
  const abbr = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  const sorted = [...settings.workDays].sort((a, b) => {
    const ord = [1, 2, 3, 4, 5, 6, 0]
    return ord.indexOf(a) - ord.indexOf(b)
  })
  const days = sorted.map(d => abbr[d]).join('-')
  return `${days} · ${hhmmToDisplay(settings.startHour)} – ${hhmmToDisplay(settings.endHour)}`
}

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
      {[110, 60, 130, 100, 100].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

// ─── edit field modal ─────────────────────────────────────────────────────────

function EditFieldModal({
  visible, title, value, placeholder, keyboardType, onClose, onSave,
}: {
  visible: boolean
  title: string
  value: string
  placeholder?: string
  keyboardType?: 'default' | 'phone-pad'
  onClose: () => void
  onSave: (v: string) => Promise<void>
}) {
  const [val, setVal] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (visible) setVal(value) }, [visible, value])

  async function handleSave() {
    setSaving(true)
    try { await onSave(val.trim()) } catch { /* parent updates state */ }
    finally { setSaving(false) }
  }

  const slide = useRef(new Animated.Value(400)).current
  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 0 : 400, duration: 260, useNativeDriver: true }).start()
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[ms.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={ms.handle} />
          <Text style={ms.sheetTitle}>{title}</Text>
          <TextInput
            style={ms.input}
            value={val}
            onChangeText={setVal}
            placeholder={placeholder}
            placeholderTextColor="#AAAAAA"
            keyboardType={keyboardType ?? 'default'}
            autoFocus
          />
          <TouchableOpacity
            style={[ms.btnPrimary, { marginTop: 20 }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={ms.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── settings row ─────────────────────────────────────────────────────────────

function SRow({
  icon, label, subtitle, value, onPress, danger, rightBadge,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  subtitle?: string
  value?: string
  onPress?: () => void
  danger?: boolean
  rightBadge?: React.ReactNode
}) {
  return (
    <TouchableOpacity
      style={styles.sRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
    >
      <View style={[styles.sRowIcon, danger && styles.sRowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? '#C0392B' : DARK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sRowLabel, danger && { color: '#C0392B' }]}>{label}</Text>
        {subtitle ? <Text style={styles.sRowSub}>{subtitle}</Text> : null}
      </View>
      {rightBadge ? rightBadge : null}
      {value ? <Text style={styles.sRowValue} numberOfLines={1}>{value}</Text> : null}
      {onPress && !danger && !rightBadge ? <Ionicons name="chevron-forward-outline" size={16} color="#CCCCCC" /> : null}
    </TouchableOpacity>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'

export default function SettingsTabScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<SettingsData | null>(null)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [copied, setCopied] = useState(false)
  const [bookingEnabled, setBookingEnabled] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showEditName, setShowEditName] = useState(false)
  const [showEditWhatsapp, setShowEditWhatsapp] = useState(false)
  const [showEditInstagram, setShowEditInstagram] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const data = await getSettings()
      if (!data) { setLoadState('error'); return }
      setProfile(data)
      setName(data.name ?? '')
      setWhatsapp(data.whatsapp ?? '')
      setInstagram(data.instagram ?? '')
      setBookingEnabled(data.settings?.bookingEnabled ?? true)
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveName(newName: string) {
    await updateSettings({ name: newName })
    setName(newName)
    setProfile(prev => prev ? { ...prev, name: newName } : prev)
    setShowEditName(false)
  }

  async function saveWhatsapp(newVal: string) {
    await updateSettings({ whatsapp: newVal })
    setWhatsapp(newVal)
    setShowEditWhatsapp(false)
  }

  async function saveInstagram(newVal: string) {
    await updateSettings({ instagram: newVal })
    setInstagram(newVal)
    setShowEditInstagram(false)
  }

  async function handleCopy() {
    if (!profile?.slug) return
    await Clipboard.setStringAsync(`${APP_URL}/p/${profile.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (!profile?.slug) return
    const link = `${APP_URL}/p/${profile.slug}`
    await Share.share({ message: `Reserva tu cita en ${link}`, url: link })
  }

  async function handleChangeAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const localUri = result.assets[0].uri
    setUploadingAvatar(true)
    try {
      const response = await fetch(localUri)
      const blob = await response.blob()
      const path = `avatars/${user.id}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('staff-avatars')
        .getPublicUrl(path)

      await updateSettings({ avatarUrl: publicUrl })
      setProfile(prev => prev ? { ...prev, avatarUrl: publicUrl } : prev)
    } catch (e) {
      console.error('[avatar upload]', e)
      Alert.alert('Error', 'No se pudo subir la foto')
    } finally { setUploadingAvatar(false) }
  }

  async function handleToggleBooking(val: boolean) {
    setBookingEnabled(val)
    try {
      await updateSettings({ settings: { bookingEnabled: val } })
    } catch {
      setBookingEnabled(!val)
      Alert.alert('Error', 'No se pudo actualizar las reservas online')
    }
  }

  function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Estás segura de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const planName = profile?.business?.plan?.name ?? 'Free'
  const bookingLink = profile?.slug ? `${APP_URL}/p/${profile.slug}` : ''

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* TopAppBar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>
                {initials(name || profile?.name || '?') || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.headerTitle}>AJUSTES</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color={DARK} />
        </TouchableOpacity>
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

      {loadState === 'ready' && profile && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Bento Profile Summary Section */}
          <View style={styles.bentoContainer}>
            <View style={styles.bentoProfileCard}>
              <TouchableOpacity
                style={styles.bentoAvatarWrap}
                onPress={handleChangeAvatar}
                disabled={uploadingAvatar}
                activeOpacity={0.78}
              >
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.bentoAvatar} />
                ) : (
                  <View style={styles.bentoAvatar}>
                    <Text style={styles.bentoAvatarText}>
                      {initials(name || profile.name || '?') || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.bentoAvatarEditBadge}>
                  {uploadingAvatar
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera-outline" size={12} color="#fff" />
                  }
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setShowEditName(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.bentoProfileName}>{name || 'MUSA Studio'}</Text>
                <Text style={styles.bentoProfileSub}>Cuenta Profesional MUSA</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bentoRevenueCard}>
              <Text style={styles.bentoRevenueLabel}>ESTADO DE FACTURACIÓN</Text>
              <View style={styles.bentoRevenueStatus}>
                <Text style={styles.bentoRevenueValue}>Activa</Text>
                <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
              </View>
            </View>
          </View>

          {/* ─── Administración ─── */}
          <Text style={styles.sectionLabel}>Administración</Text>
          <View style={styles.card}>
            <SRow
              icon="time-outline"
              label="Horario"
              onPress={() => router.push('/settings/availability' as Parameters<typeof router.push>[0])}
            />
            <View style={styles.rowDivider} />
            <SRow
              icon="business-outline"
              label="Información del negocio"
              onPress={() => router.push('/settings/business-info' as Parameters<typeof router.push>[0])}
            />
            <View style={styles.rowDivider} />
            <SRow
              icon="ribbon-outline"
              label="Plan Actual"
              subtitle="Mejorar plan"
              value={planName}
              onPress={() => Linking.openURL('https://getmusa.app/pricing')}
            />
            <View style={styles.rowDivider} />
            <View style={styles.sRow}>
              <View style={styles.sRowIcon}>
                <Ionicons name="calendar-outline" size={20} color={DARK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sRowLabel}>Reservas Online</Text>
                <Text style={styles.sRowSub}>
                  {bookingEnabled ? 'Activas · Clientas pueden reservar' : 'Desactivadas · No se aceptan reservas'}
                </Text>
              </View>
              <Switch
                value={bookingEnabled}
                onValueChange={handleToggleBooking}
                trackColor={{ false: '#DDDDDD', true: PRIMARY }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* ─── Pagos ─── */}
          <Text style={styles.sectionLabel}>Pagos</Text>
          <View style={styles.card}>
            <SRow
              icon="card-outline"
              label="Métodos de Pago"
              subtitle="Próximamente"
              onPress={() => router.push('/settings/payment-methods' as Parameters<typeof router.push>[0])}
            />
          </View>

          {/* ─── Integraciones ─── */}
          <Text style={styles.sectionLabel}>Integraciones</Text>
          <View style={styles.card}>
            <SRow
              icon="logo-whatsapp"
              label="Integración de WhatsApp"
              onPress={() => setShowEditWhatsapp(true)}
              rightBadge={
                <View style={[styles.statusBadge, whatsapp ? styles.statusBadgeConnected : null]}>
                  <Text style={[styles.statusBadgeText, whatsapp ? styles.statusBadgeTextConnected : null]}>
                    {whatsapp ? 'Conectado' : 'Configurar'}
                  </Text>
                </View>
              }
            />
            <View style={styles.rowDivider} />
            <SRow
              icon="camera-outline"
              label="Integración de Instagram"
              onPress={() => setShowEditInstagram(true)}
              rightBadge={
                <View style={[styles.statusBadge, instagram ? styles.statusBadgeConnected : null]}>
                  <Text style={[styles.statusBadgeText, instagram ? styles.statusBadgeTextConnected : null]}>
                    {instagram ? `@${instagram}` : 'Configurar'}
                  </Text>
                </View>
              }
            />
            <View style={styles.rowDivider} />
            <SRow
              icon="link-outline"
              label="Enlace de Reserva"
              onPress={handleCopy}
              rightBadge={
                <View style={styles.linkBadge}>
                  <Text style={styles.linkBadgeText} numberOfLines={1}>
                    {profile.slug ? `musa.pro/${profile.slug}` : 'Configurar'}
                  </Text>
                  <Ionicons name={copied ? 'checkmark-outline' : 'copy-outline'} size={14} color={GRAY} />
                </View>
              }
            />
          </View>

          {/* Enlace de reserva actions when configured */}
          {bookingLink ? (
            <View style={styles.linkActionsContainer}>
              <TouchableOpacity style={styles.linkActionBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={16} color={PRIMARY} />
                <Text style={styles.linkActionBtnText}>Compartir Enlace Público</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Log Out Button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={handleSignOut}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={20} color={SURFACE} style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>MUSA PRO v2.4.1</Text>
          </View>

        </ScrollView>
      )}

      <EditFieldModal
        visible={showEditName}
        title="Editar nombre"
        value={name}
        placeholder="Tu nombre completo"
        onClose={() => setShowEditName(false)}
        onSave={saveName}
      />
      <EditFieldModal
        visible={showEditWhatsapp}
        title="Editar WhatsApp"
        value={whatsapp}
        placeholder="4141234567"
        keyboardType="phone-pad"
        onClose={() => setShowEditWhatsapp(false)}
        onSave={saveWhatsapp}
      />
      <EditFieldModal
        visible={showEditInstagram}
        title="Editar Instagram"
        value={instagram}
        placeholder="tu_negocio"
        onClose={() => setShowEditInstagram(false)}
        onSave={saveInstagram}
      />
    </SafeAreaView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
    letterSpacing: -0.5,
  },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },

  // Bento Box
  bentoContainer: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  bentoProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EFE9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(48, 38, 33, 0.05)',
  },
  bentoAvatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  bentoAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bentoAvatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F2EFE9',
  },
  bentoAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F2EFE9',
  },
  bentoProfileName: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
    marginBottom: 2,
  },
  bentoProfileSub: {
    fontSize: 12,
    color: GRAY,
    marginBottom: 6,
  },
  bentoBadgeContainer: {
    flexDirection: 'row',
  },
  bentoBadge: {
    backgroundColor: 'rgba(181, 89, 62, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bentoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  bentoRevenueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  bentoRevenueLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: GRAY,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bentoRevenueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bentoRevenueValue: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GRAY,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 24,
  },

  sRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 12,
    paddingHorizontal: 16,
  },
  sRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sRowIconDanger: { backgroundColor: '#FEF2F2' },
  sRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: DARK,
  },
  sRowSub: {
    fontSize: 11,
    color: PRIMARY,
    marginTop: 1,
  },
  sRowValue: {
    fontSize: 13,
    color: GRAY,
    maxWidth: 130,
    textAlign: 'right',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: 64,
  },

  proBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },

  statusBadge: {
    backgroundColor: SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeConnected: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeText: {
    fontSize: 12,
    color: GRAY,
  },
  statusBadgeTextConnected: {
    color: '#2E7D32',
    fontWeight: '500',
  },

  linkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  linkBadgeText: {
    fontSize: 12,
    color: DARK,
    maxWidth: 140,
  },

  linkActionsContainer: {
    marginBottom: 24,
  },
  linkActionBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 8,
  },
  linkActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },

  footer: {
    marginTop: 12,
    alignItems: 'center',
    gap: 14,
  },
  logoutBtn: {
    width: '100%',
    height: 52,
    backgroundColor: DARK,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: SURFACE,
  },
  versionText: {
    fontSize: 12,
    color: GRAY,
    opacity: 0.6,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})

const ms = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 20 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 16, color: DARK, backgroundColor: SURFACE,
  },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})

