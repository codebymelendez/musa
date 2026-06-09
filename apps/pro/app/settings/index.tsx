import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Share, Linking, Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getSettings, updateSettings } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF } from '../../lib/utils'

const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://getmusa.app').replace(/\/$/, '')

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
      {[180, 120, 100].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

type LoadState = 'loading' | 'error' | 'ready'

export default function BusinessSettingsScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [slug, setSlug] = useState('')
  const [planName, setPlanName] = useState('')
  const [planLimits, setPlanLimits] = useState<{ maxMonthlyAppointments?: number; maxStaff?: number }>({})
  const [planStatus, setPlanStatus] = useState('free')
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null)
  const [latestPayment, setLatestPayment] = useState<any | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')

  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [copied, setCopied] = useState(false)

  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const data = await getSettings()
      if (!data) { setLoadState('error'); return }
      setSlug(data.slug ?? '')
      setBusinessName(data.business?.name ?? '')
      setAddress(data.business?.address ?? '')
      setDescription(data.bio ?? '')
      setWhatsapp(data.whatsapp ?? '')
      setInstagram(data.instagram ?? '')
      setPlanName(data.business?.plan?.name ?? 'Free')
      setPlanLimits(data.business?.plan?.limits ?? {})
      setPlanStatus(data.business?.planStatus ?? 'free')
      setPlanExpiresAt(data.business?.planExpiresAt ?? null)
      setLatestPayment(data.latestPayment ?? null)
      setDirty(false)
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  function markDirty() { setDirty(true) }

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings({
        businessName: businessName.trim(),
        businessAddress: address.trim(),
        bio: description.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
      })
      setSavedMsg(true)
      setDirty(false)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios')
    } finally { setSaving(false) }
  }

  async function handleCopy() {
    const link = `${APP_URL}/p/${slug}`
    await Clipboard.setStringAsync(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const link = `${APP_URL}/p/${slug}`
    await Share.share({
      message: `Reserva tu cita en ${link}`,
      url: link,
    })
  }

  const bookingLink = `${APP_URL}/p/${slug}`

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
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
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Mi negocio */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mi negocio</Text>

              {/* Avatar placeholder */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="business-outline" size={32} color={GRAY} />
                </View>
                <TouchableOpacity style={styles.changePhotoBtn} activeOpacity={0.75}>
                  <Text style={styles.changePhotoText}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nombre del negocio</Text>
              <TextInput
                style={styles.input} value={businessName}
                onChangeText={v => { setBusinessName(v); markDirty() }}
                placeholderTextColor="#AAAAAA" placeholder="Nombre de tu negocio"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Dirección</Text>
              <TextInput
                style={styles.input} value={address}
                onChangeText={v => { setAddress(v); markDirty() }}
                placeholderTextColor="#AAAAAA" placeholder="Ciudad, dirección"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Descripción</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={description}
                onChangeText={v => { setDescription(v); markDirty() }}
                multiline placeholderTextColor="#AAAAAA"
                placeholder="Describe tu negocio…"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>WhatsApp</Text>
              <View style={styles.prefixInput}>
                <Text style={styles.prefix}>+58</Text>
                <TextInput
                  style={styles.prefixField} value={whatsapp}
                  onChangeText={v => { setWhatsapp(v); markDirty() }}
                  keyboardType="phone-pad" placeholderTextColor="#AAAAAA"
                  placeholder="4141234567"
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Instagram</Text>
              <View style={styles.prefixInput}>
                <Text style={styles.prefix}>@</Text>
                <TextInput
                  style={styles.prefixField} value={instagram}
                  onChangeText={v => { setInstagram(v); markDirty() }}
                  autoCapitalize="none" placeholderTextColor="#AAAAAA"
                  placeholder="tu_negocio"
                />
              </View>
            </View>

            {/* Enlace de reserva */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enlace de reserva</Text>
              <View style={styles.linkBox}>
                <Text style={[styles.linkText, { fontFamily: MONO }]} numberOfLines={1}>
                  {bookingLink}
                </Text>
              </View>
              <View style={styles.linkActions}>
                <TouchableOpacity style={styles.linkBtn} onPress={handleCopy} activeOpacity={0.8}>
                  <Ionicons name={copied ? 'checkmark-outline' : 'copy-outline'} size={16} color={copied ? '#2E7D32' : DARK} />
                  <Text style={[styles.linkBtnText, copied && { color: '#2E7D32' }]}>
                    {copied ? '¡Copiado!' : 'Copiar enlace'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={handleShare} activeOpacity={0.8}>
                  <Ionicons name="share-outline" size={16} color={DARK} />
                  <Text style={styles.linkBtnText}>Compartir</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Plan actual */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Plan actual</Text>
              
              <View style={styles.planRow}>
                <View style={[
                  styles.planPill,
                  planStatus === 'active' && { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' },
                  (planStatus === 'expired' || planStatus === 'payment_rejected') && { backgroundColor: '#FDF0EC', borderColor: '#F5D8CE' },
                  planStatus === 'under_review' && { backgroundColor: '#FFF9EB', borderColor: '#FFE7B3' }
                ]}>
                  <Text style={[
                    styles.planPillText,
                    planStatus === 'active' && { color: '#2E7D32' },
                    (planStatus === 'expired' || planStatus === 'payment_rejected') && { color: '#C62828' },
                    planStatus === 'under_review' && { color: '#8F6B00' }
                  ]}>
                    {planStatus === 'active' ? `${planName} · Activo` : planStatus === 'under_review' ? `${planName} · En Revisión` : planStatus === 'expired' ? 'Expirado' : planStatus === 'payment_rejected' ? 'Rechazado' : planName}
                  </Text>
                </View>
              </View>

              {/* Status Alert Banners for Mobile */}
              {planStatus === 'under_review' && (
                <View style={styles.mobileAlertYellow}>
                  <Text style={styles.mobileAlertYellowText}>
                    ⏳ Pago en verificación. Referencia {latestPayment?.referenceNumber || 'S/N'}. 
                    Verificando en las próximas horas.
                  </Text>
                </View>
              )}

              {planStatus === 'payment_rejected' && (
                <View style={styles.mobileAlertRed}>
                  <Text style={styles.mobileAlertRedText}>
                    ⚠️ Pago rechazado. 
                    {latestPayment?.notes ? ` Motivo: ${latestPayment.notes}.` : ''} Por favor, reintenta el pago.
                  </Text>
                </View>
              )}

              {planStatus === 'expired' && (
                <View style={styles.mobileAlertRed}>
                  <Text style={styles.mobileAlertRedText}>
                    ❌ Suscripción expirada. Tu cuenta tiene los límites del plan gratis.
                  </Text>
                </View>
              )}

              {planStatus === 'active' && planExpiresAt && (
                <View style={styles.mobileAlertGreen}>
                  <Text style={styles.mobileAlertGreenText}>
                    📅 Vence el {new Date(planExpiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}. ¡Gracias por apoyar a GetMusa!
                  </Text>
                </View>
              )}

              <View style={styles.limitsGrid}>
                {planLimits.maxMonthlyAppointments != null && (
                  <View style={styles.limitItem}>
                    <Text style={styles.limitValue}>
                      {planStatus === 'active' ? '∞' : planLimits.maxMonthlyAppointments}
                    </Text>
                    <Text style={styles.limitLabel}>citas/mes</Text>
                  </View>
                )}
                {planLimits.maxStaff != null && (
                  <View style={styles.limitItem}>
                    <Text style={styles.limitValue}>
                      {planStatus === 'active' ? '∞' : planLimits.maxStaff}
                    </Text>
                    <Text style={styles.limitLabel}>staff máx.</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.upgradeBtn,
                  planStatus === 'active' && { borderColor: '#2E7D32' }
                ]}
                onPress={() => Linking.openURL(`${APP_URL}/settings/plans`)}
                activeOpacity={0.85}>
                <Text style={[
                  styles.upgradeBtnText,
                  planStatus === 'active' && { color: '#2E7D32' }
                ]}>
                  {planStatus === 'active' ? 'Administrar plan' : planStatus === 'under_review' ? 'Ver estado del pago' : 'Mejorar plan'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Fixed save button */}
          {(dirty || savedMsg) && (
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
          )}
        </>
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
  headerTitle: { fontFamily: SERIF, fontSize: 22, color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  changePhotoBtn: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  changePhotoText: { fontSize: 14, color: GRAY },
  label: { fontSize: 12, color: GRAY, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  prefixInput: {
    flexDirection: 'row', alignItems: 'center',
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE, overflow: 'hidden',
  },
  prefix: { paddingHorizontal: 14, fontSize: 15, color: GRAY },
  prefixField: { flex: 1, fontSize: 15, color: DARK, paddingRight: 14, height: '100%' },
  linkBox: {
    padding: 12, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    marginBottom: 12,
  },
  linkText: { fontSize: 13, color: DARK },
  linkActions: { flexDirection: 'row', gap: 10 },
  linkBtn: {
    flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  linkBtnText: { fontSize: 13, fontWeight: '500', color: DARK },
  planRow: { marginBottom: 14 },
  planPill: {
    alignSelf: 'flex-start', backgroundColor: '#FDF0EC', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: '#F5D8CE',
  },
  planPillText: { fontSize: 14, fontWeight: '500', color: PRIMARY },
  limitsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  limitItem: { alignItems: 'center' },
  limitValue: { fontSize: 22, fontWeight: '500', color: DARK },
  limitLabel: { fontSize: 11, color: GRAY, marginTop: 2 },
  upgradeBtn: {
    height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '500', color: PRIMARY },
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: SURFACE },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  savedText: { fontSize: 16, fontWeight: '500', color: '#2E7D32' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  mobileAlertYellow: {
    backgroundColor: '#FFF9EB',
    borderColor: '#FFE7B3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  mobileAlertYellowText: {
    fontSize: 12,
    color: '#8F6B00',
    lineHeight: 16,
  },
  mobileAlertRed: {
    backgroundColor: '#FDF0EC',
    borderColor: '#F5D8CE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  mobileAlertRedText: {
    fontSize: 12,
    color: '#C62828',
    lineHeight: 16,
  },
  mobileAlertGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  mobileAlertGreenText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
  },
})
