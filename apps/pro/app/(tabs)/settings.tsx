import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Modal, KeyboardAvoidingView,
  Platform, Share, Linking, Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
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
  icon, label, value, onPress, danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
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
      <Text style={[styles.sRowLabel, danger && { color: '#C0392B' }]}>{label}</Text>
      {value ? <Text style={styles.sRowValue} numberOfLines={1}>{value}</Text> : null}
      {onPress && !danger ? <Ionicons name="chevron-forward-outline" size={16} color="#CCCCCC" /> : null}
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes</Text>
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

          {/* ─── Perfil ─── */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials(name || profile.name || '?') || '?'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{name || '—'}</Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => setShowEditName(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileBtnText}>Editar nombre</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Disponibilidad ─── */}
          <Text style={styles.sectionLabel}>Disponibilidad</Text>
          <View style={styles.card}>
            <SRow
              icon="calendar-outline"
              label="Mi horario"
              value={availSummary(profile.settings ?? null)}
              onPress={() => router.push('/settings/availability' as Parameters<typeof router.push>[0])}
            />
          </View>

          {/* ─── Negocio ─── */}
          <Text style={styles.sectionLabel}>Negocio</Text>
          <View style={styles.card}>
            <SRow
              icon="business-outline"
              label="Información del negocio"
              onPress={() => router.push('/settings/business-info' as Parameters<typeof router.push>[0])}
            />
            <View style={styles.rowDivider} />
            <View style={styles.planRow}>
              <View style={styles.sRowIcon}>
                <Ionicons name="ribbon-outline" size={20} color={DARK} />
              </View>
              <Text style={styles.sRowLabel}>Plan actual</Text>
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>{planName}</Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => Linking.openURL('https://getmusa.app')}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Mejorar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Contacto ─── */}
          <Text style={styles.sectionLabel}>Contacto</Text>
          <View style={styles.card}>
            <SRow
              icon="logo-whatsapp"
              label="WhatsApp"
              value={whatsapp ? `+58 ${whatsapp}` : 'Sin configurar'}
              onPress={() => setShowEditWhatsapp(true)}
            />
            <View style={styles.rowDivider} />
            <SRow
              icon="logo-instagram"
              label="Instagram"
              value={instagram ? `@${instagram}` : 'Sin configurar'}
              onPress={() => setShowEditInstagram(true)}
            />
          </View>

          {/* ─── Enlace de reserva ─── */}
          {bookingLink ? (
            <>
              <Text style={styles.sectionLabel}>Enlace de reserva</Text>
              <View style={styles.card}>
                <View style={styles.linkBox}>
                  <Text style={[styles.linkText, { fontFamily: MONO }]} numberOfLines={1}>
                    {bookingLink}
                  </Text>
                </View>
                <View style={styles.linkActions}>
                  <TouchableOpacity style={styles.linkBtn} onPress={handleCopy} activeOpacity={0.8}>
                    <Ionicons
                      name={copied ? 'checkmark-outline' : 'copy-outline'}
                      size={16}
                      color={copied ? '#2E7D32' : PRIMARY}
                    />
                    <Text style={[styles.linkBtnText, copied && { color: '#2E7D32' }]}>
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkBtn} onPress={handleShare} activeOpacity={0.8}>
                    <Ionicons name="share-outline" size={16} color={PRIMARY} />
                    <Text style={styles.linkBtnText}>Compartir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}

          {/* ─── Cuenta ─── */}
          <Text style={styles.sectionLabel}>Cuenta</Text>
          <View style={styles.card}>
            <SRow
              icon="notifications-outline"
              label="Notificaciones"
              value="Próximamente"
            />
            <View style={styles.rowDivider} />
            <SRow
              icon="log-out-outline"
              label="Cerrar sesión"
              onPress={handleSignOut}
              danger
            />
          </View>

          <View style={{ height: 24 }} />
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
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: SERIF, fontSize: 28, color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontSize: 26, fontWeight: '500', color: PRIMARY },
  profileName: { fontSize: 17, fontWeight: '500', color: DARK, marginBottom: 3 },
  profileEmail: { fontSize: 13, color: GRAY },
  editProfileBtn: {
    height: 36, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  editProfileBtnText: { fontSize: 14, fontWeight: '500', color: DARK },

  sectionLabel: {
    fontSize: 11, fontWeight: '500', color: GRAY, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, overflow: 'hidden', marginBottom: 20,
  },

  sRow: { flexDirection: 'row', alignItems: 'center', height: 56, gap: 12, paddingHorizontal: 16 },
  sRowIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
  },
  sRowIconDanger: { backgroundColor: '#FEF2F2' },
  sRowLabel: { flex: 1, fontSize: 15, color: DARK },
  sRowValue: { fontSize: 13, color: GRAY, maxWidth: 130, textAlign: 'right', marginRight: 4 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 62 },

  planRow: { flexDirection: 'row', alignItems: 'center', height: 56, gap: 12, paddingHorizontal: 16 },
  planPill: {
    backgroundColor: '#FDF0EC', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#F5D8CE',
  },
  planPillText: { fontSize: 12, fontWeight: '500', color: PRIMARY },
  upgradeBtn: {
    paddingHorizontal: 12, height: 30, borderRadius: 15,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  upgradeBtnText: { fontSize: 12, fontWeight: '500', color: '#fff' },

  linkBox: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  linkText: { fontSize: 12, color: DARK },
  linkActions: { flexDirection: 'row', padding: 10, gap: 8 },
  linkBtn: {
    flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  linkBtnText: { fontSize: 13, fontWeight: '500', color: PRIMARY },

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
