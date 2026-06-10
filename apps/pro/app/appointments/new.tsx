import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Platform, Alert, KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { getBusinessTZ, type ClientItem, type ServiceItem } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO } from '../../lib/utils'
import DatePickerModal from '../../components/DatePickerModal'
import { getAvailableSlots } from '@musa/availability'
import { supabase } from '../../lib/supabase'
import { toZonedTime, format } from 'date-fns-tz'
import { useClients, useServices, useSettings, useCreateAppointment, keys } from '../../hooks/queries'

// ─── helpers ─────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
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
      {[120, 160, 100, 200].map((h, i) => (
        <View key={i} style={{ height: h, backgroundColor: '#F0EDE9', borderRadius: 16 }} />
      ))}
    </Animated.View>
  )
}

// ─── screen ───────────────────────────────────────────────────────────────────

type DateMode = 'today' | 'tomorrow' | 'pick'

export default function NewAppointmentScreen() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = addDays(today, 1)
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const clientsQuery = useClients()
  const servicesQuery = useServices()
  const settingsQuery = useSettings()
  const createAppointmentMutation = useCreateAppointment()

  const clients: ClientItem[] = clientsQuery.data ?? []
  const services: ServiceItem[] = servicesQuery.data ?? []
  const settingsData = settingsQuery.data ?? null
  const businessTz = getBusinessTZ(settingsData)
  const loading =
    (clientsQuery.isLoading && !clientsQuery.data) ||
    (servicesQuery.isLoading && !servicesQuery.data) ||
    (settingsQuery.isLoading && !settingsQuery.data)

  // form state
  const [clientQuery, setClientQuery] = useState('')
  const [serviceQuery, setServiceQuery] = useState('')
  const [clientId, setClientId] = useState<string | null | undefined>(undefined)
  const [clientName, setClientName] = useState<string>('')
  const [showClientList, setShowClientList] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [dateMode, setDateMode] = useState<DateMode>('today')
  const [pickedDate, setPickedDate] = useState<string>(todayISO)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [notes, setNotes] = useState('')

  const insets = useSafeAreaInsets()
  const dateStr = dateMode === 'today'
    ? todayISO
    : dateMode === 'tomorrow'
      ? `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      : pickedDate
  const businessId = settingsData?.businessId || settingsData?.business?.id

  // Slots come straight from React Query keyed by (business, date, service):
  // changing any of the three triggers exactly one fetch, no effect loops.
  // staleTime 0 + exclusion from the persister keep them always fresh.
  const slotsQuery = useQuery({
    queryKey: keys.availableSlots(businessId, dateStr, selectedService?.id),
    queryFn: () => getAvailableSlots({
      businessId: businessId!,
      date: dateStr,
      serviceId: selectedService!.id,
      supabase,
    }),
    enabled: !!(selectedService?.id && dateStr && businessId),
    staleTime: 0,
    gcTime: 60_000,
    retry: 1,
  })
  const availableSlots = slotsQuery.data ?? []
  const slotsLoading = slotsQuery.isLoading && !!(selectedService?.id && businessId)
  const creating = createAppointmentMutation.isPending

  const filteredClients = clientQuery.length > 0
    ? clients.filter(c =>
        c.name.toLowerCase().includes(clientQuery.toLowerCase()) ||
        c.phone.includes(clientQuery)
      ).slice(0, 6)
    : []

  const filteredServices = serviceQuery.trim().length > 0
    ? services.filter(s => s.name.toLowerCase().includes(serviceQuery.toLowerCase()))
    : services.slice(0, 5)

  function selectClient(c: ClientItem) {
    setClientId(c.id)
    setClientName(c.name)
    setClientQuery(c.name)
    setShowClientList(false)
  }

  function selectWalkIn() {
    setClientId(null)
    setClientName('Cliente sin registrar')
    setClientQuery('Cliente sin registrar')
    setShowClientList(false)
  }

  async function handleCreate() {
    if (!selectedService) { Alert.alert('', 'Selecciona un servicio'); return }
    if (!selectedSlot) { Alert.alert('', 'Selecciona una hora'); return }

    try {
      await createAppointmentMutation.mutateAsync({
        clientId: clientId,
        serviceId: selectedService.id,
        startTime: selectedSlot.start.toISOString(),
        endTime: selectedSlot.end.toISOString(),
        notes: notes.trim() || undefined,
        status: 'confirmed',
        businessId: settingsData?.businessId || settingsData?.business?.id || undefined,
        businessTimezone: businessTz,
      })
      router.back()
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la cita. Intenta de nuevo.')
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Cita</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <ScrollView><Skeleton /></ScrollView>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Client selector */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Clienta</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Buscar por nombre o teléfono…"
                placeholderTextColor="#AAAAAA"
                value={clientQuery}
                onChangeText={v => {
                  setClientQuery(v)
                  setClientId(undefined)
                  setClientName('')
                  setShowClientList(v.length > 0)
                }}
                onFocus={() => setShowClientList(clientQuery.length > 0)}
              />

              {showClientList && (
                <View style={styles.dropdown}>
                  <TouchableOpacity style={styles.dropdownItem} onPress={selectWalkIn} activeOpacity={0.75}>
                    <Ionicons name="person-add-outline" size={16} color={GRAY} />
                    <Text style={styles.dropdownItemText}>Cliente sin registrar</Text>
                  </TouchableOpacity>
                  {filteredClients.map(c => (
                    <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectClient(c)} activeOpacity={0.75}>
                      <Ionicons name="person-outline" size={16} color={GRAY} />
                      <View>
                        <Text style={styles.dropdownItemText}>{c.name}</Text>
                        <Text style={styles.dropdownItemSub}>{c.phone}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {filteredClients.length === 0 && clientQuery.length > 0 && (
                    <TouchableOpacity style={styles.dropdownItem} onPress={selectWalkIn} activeOpacity={0.75}>
                      <Text style={[styles.dropdownItemText, { color: GRAY }]}>Sin resultados — usar como walk-in</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {clientId !== undefined && clientName ? (
                <View style={styles.selectedClientBadge}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#2E7D32" />
                  <Text style={styles.selectedClientText}>{clientName}</Text>
                  <TouchableOpacity onPress={() => {
                    setClientId(undefined); setClientName(''); setClientQuery('')
                  }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-outline" size={18} color={GRAY} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Service selector */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Servicio</Text>
              {services.length === 0 ? (
                <Text style={styles.grayText}>Sin servicios. Añade servicios primero.</Text>
              ) : selectedService ? (
                <View style={styles.selectedSvcBadge}>
                  <Ionicons name="sparkles-outline" size={16} color={PRIMARY} />
                  <Text style={styles.selectedSvcText}>
                    {selectedService.name} ({selectedService.durationMin} min · ${selectedService.price})
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedService(null)
                      setSelectedSlot(null)
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-outline" size={18} color={GRAY} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Buscar servicio..."
                    placeholderTextColor="#AAAAAA"
                    value={serviceQuery}
                    onChangeText={setServiceQuery}
                  />

                  <View style={styles.dropdown}>
                    {filteredServices.map(svc => (
                      <TouchableOpacity
                        key={svc.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedService(svc)
                          setServiceQuery('')
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="sparkles-outline" size={16} color={GRAY} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownItemText}>{svc.name}</Text>
                          <Text style={styles.dropdownItemSub}>
                            {svc.durationMin} min · ${svc.price}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {services.length > 5 && !serviceQuery && (
                      <View style={{ padding: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: GRAY }}>
                          Escribe para buscar más servicios...
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* Date picker */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Fecha</Text>
              <View style={styles.pillsRow}>
                {(['today', 'tomorrow', 'pick'] as DateMode[]).map(mode => {
                  const label = mode === 'today' ? 'Hoy' : mode === 'tomorrow' ? 'Mañana' : 'Elegir fecha'
                  const active = dateMode === mode
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.datePill, active && styles.datePillActive]}
                      onPress={() => {
                        setDateMode(mode)
                        if (mode === 'pick') setShowDatePicker(true)
                        setSelectedSlot(null)
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.datePillText, active && styles.datePillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {dateMode === 'pick' && (
                <TouchableOpacity style={styles.pickedDateRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={16} color={PRIMARY} />
                  <Text style={[styles.pickedDateText, { fontFamily: MONO }]}>
                    {pickedDate.split('-').reverse().join('/')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Time slots */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Hora</Text>
              {!selectedService ? (
                <Text style={styles.grayText}>Selecciona un servicio primero.</Text>
              ) : slotsLoading ? (
                <View style={styles.slotsGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[styles.slotPill, { backgroundColor: '#F0EDE9', borderColor: '#EDE8E4' }]}>
                      <Text style={[styles.slotText, { color: 'transparent' }]}>00:00</Text>
                    </View>
                  ))}
                </View>
              ) : availableSlots.length === 0 ? (
                <Text style={styles.grayText}>No hay horario disponible para este día</Text>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots.map(slot => {
                    const slotStr = format(toZonedTime(slot.start, businessTz), 'HH:mm', { timeZone: businessTz })
                    const active = selectedSlot?.start.getTime() === slot.start.getTime()
                    return (
                      <TouchableOpacity
                        key={slot.start.toISOString()}
                        style={[styles.slotPill, active && styles.slotPillActive]}
                        onPress={() => setSelectedSlot(slot)}
                        activeOpacity={0.78}
                      >
                        <Text style={[styles.slotText, { fontFamily: MONO }, active && { color: '#fff' }]}>
                          {slotStr}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notas <Text style={styles.optional}>(opcional)</Text></Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Observaciones sobre la cita…"
                placeholderTextColor="#AAAAAA"
                value={notes}
                onChangeText={v => setNotes(v.slice(0, 500))}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{notes.length}/500</Text>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Fixed bottom CTA */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.btnPrimary, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {creating ? 'Creando cita…' : 'Crear Cita'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <DatePickerModal
        visible={showDatePicker}
        value={pickedDate}
        onConfirm={dateStr => { setPickedDate(dateStr); setSelectedSlot(null); setShowDatePicker(false) }}
        onCancel={() => setShowDatePicker(false)}
        title="Elegir fecha"
        minDate={todayISO}
      />
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
  navBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '500', color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: DARK, marginBottom: 14 },
  optional: { fontSize: 13, fontWeight: '400', color: GRAY },
  fieldInput: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
  },
  dropdown: {
    marginTop: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  dropdownItemText: { fontSize: 14, color: DARK },
  dropdownItemSub: { fontSize: 12, color: GRAY, marginTop: 1 },
  selectedClientBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, padding: 10, backgroundColor: '#F0F9F0',
    borderRadius: 10, borderWidth: 1, borderColor: '#B8E6B8',
  },
  selectedClientText: { flex: 1, fontSize: 14, color: '#2E7D32' },
  selectedSvcBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, backgroundColor: 'rgba(181, 89, 62, 0.05)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(181, 89, 62, 0.2)',
  },
  selectedSvcText: { flex: 1, fontSize: 14, color: PRIMARY },
  pillsRow: { flexDirection: 'row', gap: 8 },
  datePill: {
    flex: 1, height: 40, borderRadius: 20,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  datePillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  datePillText: { fontSize: 13, fontWeight: '500', color: DARK },
  datePillTextActive: { color: '#fff' },
  pickedDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 12, backgroundColor: SURFACE,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    alignSelf: 'flex-start',
  },
  pickedDateText: { fontSize: 15, color: DARK },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotPill: {
    paddingHorizontal: 14, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  slotPillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  slotText: { fontSize: 13, color: DARK },
  notesInput: {
    height: 90, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingTop: 12, fontSize: 15, color: DARK,
    backgroundColor: SURFACE,
  },
  charCount: { fontSize: 11, color: '#BBBBBB', textAlign: 'right', marginTop: 4 },
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
  },
  btnPrimary: {
    height: 52, backgroundColor: PRIMARY, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  grayText: { fontSize: 14, color: '#AAAAAA' },
})
