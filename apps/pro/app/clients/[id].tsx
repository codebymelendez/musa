import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Linking, Modal, RefreshControl,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { getClientById, updateClientNotes, type ClientItem, type AppointmentStatus } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, initials, formatTime, formatShortDate, formatMoney } from '../../lib/utils'

// ─── status pill (mini) ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  confirmed: { bg: '#E8F5E9', text: '#2E7D32' },
  pending:   { bg: '#FFF8E1', text: '#8B6914' },
  cancelled: { bg: '#FDECEA', text: '#C62828' },
  completed: { bg: '#F5F5F5', text: '#757575' },
}
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada', completed: 'Completada',
}

function MiniPill({ status }: { status: AppointmentStatus }) {
  const { bg, text } = STATUS_COLORS[status]
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: text }]}>{STATUS_LABEL[status]}</Text>
    </View>
  )
}

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
    <Animated.View style={[styles.skeletonWrap, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      {[80, 55, 40].map((w, i) => (
        <View key={i} style={[styles.skeletonLine, { width: `${w}%`, marginTop: i === 0 ? 20 : 10 }]} />
      ))}
    </Animated.View>
  )
}

// ─── notes modal ──────────────────────────────────────────────────────────────

function NotesModal({
  visible, initial, onClose, onSave,
}: { visible: boolean; initial: string; onClose: () => void; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  useEffect(() => { if (visible) setValue(initial) }, [visible, initial])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notas</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-outline" size={24} color={DARK} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.notesInput}
            value={value}
            onChangeText={setValue}
            multiline
            placeholder="Escribe notas sobre esta clienta..."
            placeholderTextColor="#AAAAAA"
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => onSave(value)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Guardar notas</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; data: ClientItem }

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [notesModal, setNotesModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setState({ kind: 'loading' })
    try {
      const data = await getClientById(id)
      setState(data ? { kind: 'ok', data } : { kind: 'error' })
    } catch { setState({ kind: 'error' }) }
  }, [id])

  useEffect(() => { load() }, [load])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function saveNotes(notes: string) {
    if (!id) return
    setSaving(true)
    try {
      await updateClientNotes(id, notes)
      setState(prev => prev.kind === 'ok' ? { ...prev, data: { ...prev.data, notes } } : prev)
      setNotesModal(false)
    } catch { /* silently fail — could show toast */ }
    finally { setSaving(false) }
  }

  const title = state.kind === 'ok' ? state.data.name : 'Clienta'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      {state.kind === 'loading' && <ScrollView contentContainerStyle={styles.content}><Skeleton /></ScrollView>}

      {state.kind === 'error' && (
        <View style={styles.centerState}>
          <Text style={styles.grayText}>No se pudo cargar la ficha</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.kind === 'ok' && (() => {
        const c = state.data
        return (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
            >
              {/* Hero */}
              <View style={styles.heroSection}>
                <View style={styles.avatarLg}>
                  <Text style={styles.avatarLgText}>{initials(c.name)}</Text>
                </View>
                <Text style={styles.heroName}>{c.name}</Text>
                <TouchableOpacity
                  style={styles.phoneRow}
                  onPress={() => Linking.openURL(`tel:${c.phone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={16} color={PRIMARY} />
                  <Text style={styles.phoneText}>{c.phone}</Text>
                </TouchableOpacity>

                {/* Tags */}
                {c.tags && c.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {c.tags.map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Appointment history */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Historial de citas</Text>
                {!c.appointments || c.appointments.length === 0 ? (
                  <Text style={styles.grayText}>Sin citas registradas</Text>
                ) : (
                  c.appointments.map(apt => (
                    <TouchableOpacity
                      key={apt.id}
                      style={styles.aptRow}
                      onPress={() => router.push(`/appointments/${apt.id}` as Parameters<typeof router.push>[0])}
                      activeOpacity={0.72}
                    >
                      <View style={styles.aptLeft}>
                        <Text style={styles.aptDate}>{formatShortDate(apt.startTime)}</Text>
                        <Text style={styles.aptService}>{apt.service?.name ?? '—'}</Text>
                      </View>
                      <View style={styles.aptRight}>
                        {apt.service?.price != null && (
                          <Text style={[styles.aptPrice, { fontFamily: MONO }]}>
                            {formatMoney(apt.service.price)}
                          </Text>
                        )}
                        <MiniPill status={apt.status} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Notes */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Notas</Text>
                  <TouchableOpacity onPress={() => setNotesModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.editLink}>Editar</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.notesText}>
                  {c.notes ? c.notes : <Text style={styles.grayText}>Sin notas</Text>}
                </Text>
              </View>
            </ScrollView>

            <NotesModal
              visible={notesModal}
              initial={c.notes ?? ''}
              onClose={() => setNotesModal(false)}
              onSave={saveNotes}
            />
          </>
        )
      })()}
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '500', color: DARK, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 32 },
  avatarLg: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarLgText: { fontSize: 26, fontWeight: '500', color: PRIMARY },
  heroName: { fontFamily: SERIF, fontSize: 24, color: DARK, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  phoneText: { fontSize: 15, color: PRIMARY },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: { backgroundColor: '#EDE8E4', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, color: DARK },
  sectionBlock: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editLink: { fontSize: 14, color: PRIMARY },
  aptRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  aptLeft: { flex: 1 },
  aptDate: { fontSize: 13, fontWeight: '500', color: DARK },
  aptService: { fontSize: 13, color: GRAY, marginTop: 2 },
  aptRight: { alignItems: 'flex-end', gap: 4 },
  aptPrice: { fontSize: 13, color: DARK },
  notesText: { fontSize: 15, color: DARK, lineHeight: 22 },
  grayText: { fontSize: 14, color: '#AAAAAA' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '500' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  retryBtn: { height: 48, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  // modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '500', color: DARK },
  notesInput: {
    minHeight: 120, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    padding: 14, fontSize: 15, color: DARK, marginBottom: 16,
  },
  btnPrimary: { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  // skeleton
  skeletonWrap: { alignItems: 'center', paddingTop: 16 },
  skeletonAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0EDE9' },
  skeletonLine: { height: 14, backgroundColor: '#F0EDE9', borderRadius: 6, alignSelf: 'stretch' },
})
