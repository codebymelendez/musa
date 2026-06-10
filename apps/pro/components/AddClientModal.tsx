import { useState, useEffect, useRef } from 'react'
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { type ClientItem } from '../lib/api'
import { useCreateClient } from '../hooks/queries'
import { validate, clientFormSchema } from '../lib/validation'
import { PRIMARY, DARK, BORDER, GRAY, SERIF, SURFACE } from '../lib/utils'
import DatePickerModal, { formatDateSpanish } from './DatePickerModal'

const TAGS = ['VIP', 'Nueva', 'Regular', 'Frecuente'] as const

export default function AddClientModal({
  visible, onClose, onCreated,
}: {
  visible: boolean
  onClose: () => void
  onCreated: (c: ClientItem) => void
}) {
  const [name,             setName]             = useState('')
  const [phone,            setPhone]            = useState('')
  const [email,            setEmail]            = useState('')
  const [birthday,         setBirthday]         = useState<string | null>(null)
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [notes,            setNotes]            = useState('')
  const [selectedTags,     setSelectedTags]     = useState<string[]>([])
  const createClientMutation = useCreateClient()
  const saving = createClientMutation.isPending

  const today = new Date().toISOString().split('T')[0]

  function reset() {
    setName(''); setPhone(''); setEmail(''); setBirthday(null)
    setNotes(''); setSelectedTags([])
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleCreate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const parsed = validate(clientFormSchema, {
      name:     name.trim(),
      phone:    phone.trim(),
      email:    email.trim() || undefined,
      notes:    notes.trim() || undefined,
      tags:     selectedTags,
      birthday: birthday ?? undefined,
    })
    if (!parsed.ok) { Alert.alert('', parsed.error); return }
    try {
      const client = await createClientMutation.mutateAsync(parsed.data)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      onCreated(client)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear la clienta')
    }
  }

  const slideAnim = useRef(new Animated.Value(500)).current
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 500, duration: 280, useNativeDriver: true,
    }).start()
    if (!visible) reset()
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={ms.handle} />
          <Text style={ms.title}>Nueva clienta</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={ms.label}>Nombre completo *</Text>
            <TextInput
              style={ms.input} value={name} onChangeText={setName}
              placeholder="María García" placeholderTextColor="#AAAAAA"
            />

            <Text style={[ms.label, { marginTop: 14 }]}>Teléfono *</Text>
            <TextInput
              style={ms.input} value={phone} onChangeText={setPhone}
              placeholder="04141234567" placeholderTextColor="#AAAAAA"
              keyboardType="phone-pad"
            />

            <Text style={[ms.label, { marginTop: 14 }]}>
              Email <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TextInput
              style={ms.input} value={email} onChangeText={setEmail}
              placeholder="maria@email.com" placeholderTextColor="#AAAAAA"
              keyboardType="email-address" autoCapitalize="none"
            />

            <Text style={[ms.label, { marginTop: 14 }]}>
              Cumpleaños <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TouchableOpacity
              style={ms.dateBtn}
              onPress={() => setShowBirthdayPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
              <Text style={[ms.dateBtnText, !birthday && { color: '#AAAAAA' }]}>
                {birthday ? formatDateSpanish(birthday) : 'Seleccionar fecha'}
              </Text>
              {birthday ? (
                <TouchableOpacity
                  onPress={() => setBirthday(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#CCCCCC" />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            <Text style={[ms.label, { marginTop: 14 }]}>
              Notas <Text style={{ color: GRAY }}>(opcional)</Text>
            </Text>
            <TextInput
              style={[ms.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              value={notes} onChangeText={setNotes} multiline
              placeholder="Preferencias, alergias…" placeholderTextColor="#AAAAAA"
            />

            <Text style={[ms.label, { marginTop: 14 }]}>Etiquetas</Text>
            <View style={ms.tagsRow}>
              {TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[ms.tagChip, active && ms.tagChipActive]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.78}
                  >
                    <Text style={[ms.tagText, active && { color: '#fff' }]}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[ms.btnPrimary, { marginTop: 24, marginBottom: 8 }, saving && { opacity: 0.6 }]}
              onPress={handleCreate} disabled={saving} activeOpacity={0.85}
            >
              <Text style={ms.btnPrimaryText}>{saving ? 'Creando…' : 'Crear clienta'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showBirthdayPicker}
        value={birthday}
        onConfirm={date => { setBirthday(date); setShowBirthdayPicker(false) }}
        onCancel={() => setShowBirthdayPicker(false)}
        title="Cumpleaños"
        maxDate={today}
        minDate="1940-01-01"
      />
    </Modal>
  )
}

const ms = StyleSheet.create({
  overlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginBottom: 16,
  },
  title:        { fontFamily: SERIF, fontSize: 22, color: DARK, marginBottom: 20 },
  label:        { fontSize: 12, color: GRAY, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, backgroundColor: SURFACE,
  },
  dateBtnText:      { flex: 1, fontSize: 15, color: DARK },
  tagsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 16, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  tagChipActive:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tagText:          { fontSize: 13, fontWeight: '500', color: DARK },
  btnPrimary:       { height: 52, backgroundColor: PRIMARY, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText:   { color: '#fff', fontSize: 16, fontWeight: '500' },
})
