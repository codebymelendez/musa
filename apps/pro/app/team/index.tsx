import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Animated, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getSettings, inviteTeamMember, type SettingsData, type TeamMember, type TeamInvitation } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF, initials } from '../../lib/utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatJoinDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

// ─── member row ───────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: TeamMember }) {
  const isOwner = member.appRole === 'owner' || member.appRole === 'OWNER'
  return (
    <View style={teamStyles.memberRow}>
      <View style={teamStyles.avatar}>
        <Text style={teamStyles.avatarText}>{initials(member.name)}</Text>
      </View>
      <View style={teamStyles.memberInfo}>
        <View style={teamStyles.memberNameRow}>
          <Text style={teamStyles.memberName}>{member.name}</Text>
          <View style={[teamStyles.rolePill, isOwner ? teamStyles.rolePillOwner : teamStyles.rolePillStaff]}>
            <Text style={[teamStyles.roleText, isOwner ? { color: PRIMARY } : { color: GRAY }]}>
              {isOwner ? 'OWNER' : 'STAFF'}
            </Text>
          </View>
        </View>
        <Text style={teamStyles.memberEmail}>{member.email}</Text>
        <Text style={teamStyles.memberDate}>Desde {formatJoinDate(member.createdAt)}</Text>
      </View>
    </View>
  )
}

// ─── invite modal ─────────────────────────────────────────────────────────────

function InviteModal({
  visible, onClose,
}: {
  visible: boolean; onClose: (invited?: string) => void
}) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  async function handleInvite() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('', 'Ingresa un email válido'); return
    }
    setSending(true)
    try {
      await inviteTeamMember(trimmed)
      setEmail('')
      onClose(trimmed)
    } catch {
      Alert.alert('Error', 'No se pudo enviar la invitación. Verifica el email e intenta de nuevo.')
    } finally { setSending(false) }
  }

  const slideAnim = useRef(new Animated.Value(300)).current
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 300, duration: 260, useNativeDriver: true,
    }).start()
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => onClose()}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={teamStyles.overlay} activeOpacity={1} onPress={() => onClose()} />
        <Animated.View style={[teamStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={teamStyles.sheetHandle} />
          <Text style={teamStyles.sheetTitle}>Invitar miembro</Text>

          <Text style={teamStyles.label}>Email *</Text>
          <TextInput
            style={teamStyles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#AAAAAA"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={teamStyles.rolePillStatic}>
            <Ionicons name="person-outline" size={16} color={GRAY} />
            <Text style={teamStyles.rolePillStaticText}>Rol: Staff — puede ver y gestionar citas</Text>
          </View>

          <TouchableOpacity
            style={[teamStyles.btnPrimary, { marginTop: 24 }, sending && { opacity: 0.6 }]}
            onPress={handleInvite} disabled={sending} activeOpacity={0.85}>
            <Text style={teamStyles.btnPrimaryText}>{sending ? 'Enviando…' : 'Enviar invitación'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── skeleton ──────────────────────────────────────────────────────────────────

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
      {[80, 80, 80].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'error' | 'ready'

export default function TeamScreen() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const data = await getSettings()
      if (!data) { setLoadState('error'); return }
      setMembers(data.business?.users ?? [])
      setInvitations(data.business?.invitations ?? [])
      setLoadState('ready')
    } catch { setLoadState('error') }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  function handleInvited(email: string) {
    const fake: TeamInvitation = {
      id: Date.now().toString(),
      email,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    setInvitations(prev => [...prev, fake])
    setShowInviteModal(false)
    Alert.alert('', `Invitación enviada a ${email}`)
  }

  return (
    <SafeAreaView style={teamStyles.safe} edges={['top']}>
      <View style={teamStyles.header}>
        <TouchableOpacity style={teamStyles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={teamStyles.headerTitle}>Mi Equipo</Text>
        <View style={teamStyles.backBtn} />
      </View>

      {loadState === 'loading' && !refreshing && <Skeleton />}

      {loadState === 'error' && (
        <View style={teamStyles.center}>
          <Text style={teamStyles.grayText}>No se pudo cargar el equipo</Text>
          <TouchableOpacity style={teamStyles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={teamStyles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === 'ready' && (
        <ScrollView
          contentContainerStyle={teamStyles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {/* Members */}
          <View style={teamStyles.card}>
            <Text style={teamStyles.cardTitle}>
              Miembros activos ({members.length})
            </Text>
            {members.length === 0 ? (
              <Text style={teamStyles.grayText}>Solo tú en este momento</Text>
            ) : (
              members.map((m, i) => (
                <View key={m.id}>
                  <MemberRow member={m} />
                  {i < members.length - 1 && <View style={teamStyles.divider} />}
                </View>
              ))
            )}
          </View>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <View style={teamStyles.card}>
              <Text style={teamStyles.cardTitle}>Invitaciones pendientes ({invitations.length})</Text>
              {invitations.map((inv, i) => (
                <View key={inv.id}>
                  <View style={teamStyles.invRow}>
                    <View style={teamStyles.invIcon}>
                      <Ionicons name="mail-outline" size={18} color={GRAY} />
                    </View>
                    <View style={teamStyles.invInfo}>
                      <Text style={teamStyles.invEmail}>{inv.email}</Text>
                      <Text style={teamStyles.invStatus}>Pendiente · enviada {formatJoinDate(inv.createdAt)}</Text>
                    </View>
                  </View>
                  {i < invitations.length - 1 && <View style={teamStyles.divider} />}
                </View>
              ))}
            </View>
          )}

          {/* Info note */}
          <View style={teamStyles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={GRAY} />
            <Text style={teamStyles.infoText}>
              Los miembros del equipo pueden ver y gestionar citas.
              Solo el propietario puede modificar servicios y ajustes del negocio.
            </Text>
          </View>

          {/* Invite button */}
          <TouchableOpacity
            style={teamStyles.btnPrimary}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={teamStyles.btnPrimaryText}>Invitar miembro</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <InviteModal
        visible={showInviteModal}
        onClose={email => email ? handleInvited(email) : setShowInviteModal(false)}
      />
    </SafeAreaView>
  )
}

const teamStyles = StyleSheet.create({
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
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '500', color: PRIMARY },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberName: { fontSize: 15, fontWeight: '500', color: DARK },
  rolePill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    borderWidth: 1,
  },
  rolePillOwner: { backgroundColor: '#FDF0EC', borderColor: '#F5D8CE' },
  rolePillStaff: { backgroundColor: '#F5F5F5', borderColor: '#DDDDDD' },
  roleText: { fontSize: 10, fontWeight: '500' },
  memberEmail: { fontSize: 13, color: GRAY },
  memberDate: { fontSize: 12, color: '#BBBBBB', marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 14 },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  invInfo: { flex: 1 },
  invEmail: { fontSize: 14, fontWeight: '500', color: DARK },
  invStatus: { fontSize: 12, color: GRAY, marginTop: 2 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: GRAY, lineHeight: 19 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  btnPrimary: {
    height: 52, backgroundColor: PRIMARY, borderRadius: 26,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 20 },
  label: { fontSize: 12, color: GRAY, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  rolePillStatic: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, padding: 12, backgroundColor: SURFACE,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER,
  },
  rolePillStaticText: { fontSize: 14, color: GRAY },
})
