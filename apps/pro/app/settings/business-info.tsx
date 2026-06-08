import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Switch, Modal,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import MapView, { Marker } from 'react-native-maps'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import DateTimePicker from '@react-native-community/datetimepicker'
import { randomUUID } from 'expo-crypto'

import { supabase } from '../../lib/supabase'
import { getSettings } from '../../lib/api'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, initials } from '../../lib/utils'

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? ''

interface BusinessHoursState {
  id?: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isOpen: boolean
}

interface BusinessPhotoItem {
  id: string
  url: string
  sortOrder: number
}

const SLOT_OPTIONS = [15, 30, 45, 60, 90]

const TIMEZONE_OPTIONS = [
  { label: 'Venezuela',  value: 'America/Caracas' },
  { label: 'Colombia',   value: 'America/Bogota' },
  { label: 'Perú',       value: 'America/Lima' },
  { label: 'México',     value: 'America/Mexico_City' },
  { label: 'Argentina',  value: 'America/Argentina/Buenos_Aires' },
  { label: 'España',     value: 'Europe/Madrid' },
  { label: 'UTC',        value: 'UTC' },
]

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

const DAYS_OF_WEEK = [
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
]

export default function BusinessInfoScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)

  // Section 1: General Info
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')

  // Section 2: Photos
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [galleryPhotos, setGalleryPhotos] = useState<BusinessPhotoItem[]>([])

  // Section 3: Location & Modality
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('America/Caracas')
  const [serviceMode, setServiceMode] = useState<'inStore' | 'homeVisit' | 'both'>('inStore')

  // Section 4: Business Hours
  const [businessHours, setBusinessHours] = useState<BusinessHoursState[]>([])
  const [slotDuration, setSlotDuration] = useState(30)
  
  // DateTimePicker Temp State
  const [pickerShow, setPickerShow] = useState<{ day: number; type: 'open' | 'close' } | null>(null)
  const [iosTempTime, setIosTempTime] = useState<string | null>(null)

  const insets = useSafeAreaInsets()
  const placesRef = useRef<any>(null)
  const mapRef = useRef<MapView | null>(null)

  // Animate map when coordinates change
  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500)
    }
  }, [latitude, longitude])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const settings = await getSettings()
      const bId = settings?.businessId
      if (!bId) {
        Alert.alert('Error', 'No se encontró el negocio vinculado al usuario')
        router.back()
        return
      }
      setBusinessId(bId)

      // Query Business info directly for completeness
      const { data: business, error: bError } = await supabase
        .from('Business')
        .select('*')
        .eq('id', bId)
        .single()

      if (bError || !business) {
        throw new Error(bError?.message ?? 'No se pudo cargar el negocio')
      }

      setName(business.name ?? '')
      setPhone(business.phone ?? '')
      setEmail(business.email ?? '')
      setWebsite(business.website ?? '')
      setDescription(business.description ?? '')
      setLogoUrl(business.logoUrl ?? null)
      setCoverUrl(business.coverUrl ?? null)
      setAddress(business.address ?? '')
      setTimeout(() => {
        placesRef.current?.setAddressText(business.address ?? '')
      }, 100)
      setLatitude(business.latitude ?? null)
      setLongitude(business.longitude ?? null)
      setCountry(business.country ?? '')
      setTimezone(business.timezone ?? 'America/Caracas')
      setServiceMode((business.serviceMode as 'inStore' | 'homeVisit' | 'both') ?? 'inStore')

      const slotDur = settings?.settings?.slotDuration ?? 30
      setSlotDuration(slotDur)

      // Query gallery photos
      const { data: photos } = await supabase
        .from('BusinessPhoto')
        .select('*')
        .eq('businessId', bId)
        .eq('type', 'gallery')
        .order('sortOrder', { ascending: true })

      setGalleryPhotos((photos ?? []).map(p => ({
        id: p.id,
        url: p.url,
        sortOrder: p.sortOrder,
      })))

      // Query BusinessHours (userId = null)
      const { data: hours } = await supabase
        .from('BusinessHours')
        .select('*')
        .eq('businessId', bId)
        .is('userId', null)

      // Map to full 7 days, setting defaults if missing
      const hoursMap = (hours ?? []).reduce((acc, curr) => {
        acc[curr.dayOfWeek] = curr
        return acc
      }, {} as Record<number, any>)

      const finalHours = DAYS_OF_WEEK.map(d => {
        const existing = hoursMap[d.value]
        return {
          id: existing?.id,
          dayOfWeek: d.value,
          openTime: existing?.openTime ? existing.openTime.slice(0, 5) : '09:00',
          closeTime: existing?.closeTime ? existing.closeTime.slice(0, 5) : '18:00',
          isOpen: existing?.isOpen ?? true,
        }
      })
      setBusinessHours(finalHours)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al cargar la información')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const pickImage = async (target: 'logo' | 'cover' | 'gallery') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar las imágenes')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: target !== 'gallery',
      aspect: target === 'logo' ? [1, 1] : target === 'cover' ? [16, 9] : undefined,
      quality: 0.8,
    })

    if (result.canceled || !result.assets?.[0]?.uri) return

    const localUri = result.assets[0].uri
    uploadPhoto(localUri, target)
  }

  const uploadPhoto = async (uri: string, target: 'logo' | 'cover' | 'gallery') => {
    if (!businessId) return
    try {
      setSaving(true)
      const response = await fetch(uri)
      const blob = await response.blob()
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${businessId}/${target}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(fileName, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('business-photos')
        .getPublicUrl(fileName)

      if (target === 'logo') {
        setLogoUrl(publicUrl)
      } else if (target === 'cover') {
        setCoverUrl(publicUrl)
      } else {
        // Gallery photo
        if (galleryPhotos.length >= 6) {
          Alert.alert('Límite alcanzado', 'Puedes subir un máximo de 6 fotos a la galería')
          return
        }

        // Add to BusinessPhoto DB table
        const { data: newPhoto, error: dbError } = await supabase
          .from('BusinessPhoto')
          .insert({
            businessId,
            url: publicUrl,
            type: 'gallery',
            sortOrder: galleryPhotos.length,
          })
          .select()
          .single()

        if (dbError) throw dbError
        
        setGalleryPhotos(prev => [...prev, {
          id: newPhoto.id,
          url: newPhoto.url,
          sortOrder: newPhoto.sortOrder,
        }])
      }
    } catch (err: any) {
      Alert.alert('Error de subida', err.message || 'No se pudo subir la imagen')
    } finally {
      setSaving(false)
    }
  }

  const removeGalleryPhoto = async (photoId: string) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('BusinessPhoto')
        .delete()
        .eq('id', photoId)

      if (error) throw error
      setGalleryPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo eliminar la imagen')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAll = async () => {
    if (!businessId) return
    if (!name.trim()) {
      Alert.alert('Falta información', 'El nombre del negocio es obligatorio')
      return
    }

    try {
      setSaving(true)

      // 1. Update Business info
      const { error: bError } = await supabase
        .from('Business')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          description: description.trim() || null,
          logoUrl,
          coverUrl,
          address: address.trim() || null,
          latitude,
          longitude,
          country: country || null,
          timezone,
          serviceMode,
        })
        .eq('id', businessId)

      if (bError) throw bError

      // 2. Upsert BusinessHours (userId = null)
      const hoursPayload = businessHours.map(bh => ({
        id: bh.id || randomUUID(),
        businessId,
        dayOfWeek: bh.dayOfWeek,
        openTime: bh.openTime,
        closeTime: bh.closeTime,
        isOpen: bh.isOpen,
        userId: null,
      }))

      const { error: hError } = await supabase
        .from('BusinessHours')
        .upsert(hoursPayload)

      if (hError) throw hError

      // Sync to ProfessionalSettings for backward compatibility with web client
      try {
        const openDays = businessHours.filter(bh => bh.isOpen).map(bh => bh.dayOfWeek)
        
        let minStart = 900
        let maxEnd = 1800
        if (openDays.length > 0) {
          const parseToHhmmInt = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number)
            return h * 100 + m
          }
          const openTimeInts = businessHours.filter(bh => bh.isOpen).map(bh => parseToHhmmInt(bh.openTime))
          const closeTimeInts = businessHours.filter(bh => bh.isOpen).map(bh => parseToHhmmInt(bh.closeTime))
          minStart = Math.min(...openTimeInts)
          maxEnd = Math.max(...closeTimeInts)
        }

        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.id) {
          await supabase
            .from('ProfessionalSettings')
            .update({
              workDays: JSON.stringify(openDays),
              startHour: minStart,
              endHour: maxEnd,
              slotDuration,
            })
            .eq('userId', userData.user.id)
        }
      } catch (syncErr) {
        console.error('Error syncing to ProfessionalSettings:', syncErr)
      }

      Alert.alert('Éxito', 'Configuración del negocio guardada correctamente')
      loadData()
    } catch (err: any) {
      Alert.alert('Error al guardar', err.message || 'Ocurrió un error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const handleHoursToggle = (dayValue: number, checked: boolean) => {
    setBusinessHours(prev => prev.map(bh => {
      if (bh.dayOfWeek === dayValue) {
        return { ...bh, isOpen: checked }
      }
      return bh
    }))
  }

  const showTimePicker = (dayValue: number, type: 'open' | 'close') => {
    setPickerShow({ day: dayValue, type })
  }

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (!pickerShow) return
    const currentPicker = pickerShow
    setPickerShow(null)

    if (event.type === 'dismissed' || !selectedDate) return

    const hours = String(selectedDate.getHours()).padStart(2, '0')
    const mins = String(selectedDate.getMinutes()).padStart(2, '0')
    const formatted = `${hours}:${mins}`

    setBusinessHours(prev => prev.map(bh => {
      if (bh.dayOfWeek === currentPicker.day) {
        return {
          ...bh,
          openTime: currentPicker.type === 'open' ? formatted : bh.openTime,
          closeTime: currentPicker.type === 'close' ? formatted : bh.closeTime,
        }
      }
      return bh
    }))
  }

  const getDatePickerValue = () => {
    if (!pickerShow) return new Date()
    const target = businessHours.find(bh => bh.dayOfWeek === pickerShow.day)
    const timeStr = pickerShow.type === 'open' ? target?.openTime : target?.closeTime
    const [h, m] = (timeStr || '09:00').split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rediseño de Negocio</Text>
        <View style={styles.backBtn} />
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
            keyboardDismissMode="on-drag"
          >
            {/* SECTION 1: INFORMACIÓN GENERAL */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Información General</Text>
              
              <Text style={styles.label}>Nombre del negocio *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Studio de Belleza MUSA"
                placeholderTextColor="#AAAAAA"
              />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej. +58 412 1234567"
                placeholderTextColor="#AAAAAA"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email del negocio</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Ej. info@negocio.com"
                placeholderTextColor="#AAAAAA"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Sitio web</Text>
              <TextInput
                style={styles.input}
                value={website}
                onChangeText={setWebsite}
                placeholder="Ej. https://misitio.com"
                placeholderTextColor="#AAAAAA"
                keyboardType="url"
                autoCapitalize="none"
              />

              <View style={styles.descriptionHeader}>
                <Text style={styles.label}>Descripción</Text>
                <Text style={styles.counter}>{description.length} / 300</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={description}
                onChangeText={v => {
                  if (v.length <= 300) setDescription(v)
                }}
                placeholder="Cuéntale a tus clientes sobre la experiencia y especialidades de tu salón..."
                placeholderTextColor="#AAAAAA"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* SECTION 2: FOTOS */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Fotos</Text>

              {/* Logo selection */}
              <View style={styles.photoUploadRow}>
                <View style={styles.logoCircleWrapper}>
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logoCircle} />
                  ) : (
                    <View style={styles.logoCircle}>
                      <Text style={styles.avatarInitials}>{initials(name || 'M')}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.logoEditBadge} onPress={() => pickImage('logo')}>
                    <Ionicons name="camera-outline" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.photoDescContainer}>
                  <Text style={styles.photoTitle}>Logo del Negocio</Text>
                  <Text style={styles.photoSub}>Imagen circular recomendada (80x80px). Se muestra en búsquedas y reservas.</Text>
                </View>
              </View>

              {/* Cover Photo */}
              <Text style={styles.photoTitleLabel}>Foto de Portada</Text>
              <TouchableOpacity style={styles.coverWrapper} onPress={() => pickImage('cover')} activeOpacity={0.9}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={GRAY} />
                    <Text style={styles.coverPlaceholderText}>Seleccionar banner horizontal (16:9)</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Place Gallery */}
              <View style={styles.galleryHeader}>
                <Text style={styles.photoTitleLabel}>Galería del Lugar</Text>
                <Text style={styles.counter}>{galleryPhotos.length} / 6</Text>
              </View>
              <View style={styles.galleryGrid}>
                {galleryPhotos.map((photo) => (
                  <View key={photo.id} style={styles.galleryPhotoWrapper}>
                    <Image source={{ uri: photo.url }} style={styles.galleryPhoto} />
                    <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => removeGalleryPhoto(photo.id)}>
                      <Ionicons name="close-circle" size={18} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ))}
                {galleryPhotos.length < 6 && (
                  <TouchableOpacity style={styles.galleryAddBtn} onPress={() => pickImage('gallery')}>
                    <Ionicons name="add-outline" size={24} color={PRIMARY} />
                    <Text style={styles.galleryAddText}>Añadir</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* SECTION 3: LOCALIZACIÓN Y MODALIDAD */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Localización y Modalidad</Text>

              <Text style={styles.label}>Dirección física del negocio</Text>
              <View style={styles.autocompleteWrapper}>
                <GooglePlacesAutocomplete
                  ref={placesRef}
                  placeholder="Busca la dirección..."
                  fetchDetails={true}
                  onPress={async (data, details = null) => {
                    if (details) {
                      const detailsAny = details as any
                      const lat = detailsAny.geometry.location.lat
                      const lng = detailsAny.geometry.location.lng
                      const formattedAddress = detailsAny.formatted_address

                      const countryComp = detailsAny.address_components.find((c: any) => c.types.includes('country'))
                      const detectedCountry = countryComp ? countryComp.short_name : 'VE'

                      setAddress(formattedAddress)
                      setLatitude(lat)
                      setLongitude(lng)
                      setCountry(detectedCountry)

                      // Fetch Timezone dynamically using Places API coordinates
                      if (GOOGLE_PLACES_API_KEY) {
                        try {
                          const tzRes = await fetch(
                            `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${GOOGLE_PLACES_API_KEY}`
                          )
                          const tzData = await tzRes.json()
                          if (tzData.timeZoneId) {
                            setTimezone(tzData.timeZoneId)
                          }
                        } catch (e) {
                          console.log('Error fetching timezone', e)
                        }
                      }
                    }
                  }}
                  query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'es',
                    components: 'country:ve|country:es|country:mx|country:co',
                  }}
                  onFail={(error) => console.error('Places error:', error)}
                  styles={{
                    textInput: styles.autocompleteInput,
                    container: { flex: 0 },
                    listView: styles.autocompleteList,
                  }}
                  textInputProps={{
                    placeholderTextColor: '#AAAAAA',
                    onChangeText: setAddress,
                  }}
                />
              </View>

              {/* Map Preview */}
              <View style={styles.mapContainer}>
                {latitude && longitude ? (
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                      latitude,
                      longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                  >
                    <Marker coordinate={{ latitude, longitude }} />
                  </MapView>
                ) : (
                  <View style={styles.mapEmpty}>
                    <Ionicons name="map-outline" size={28} color={GRAY} />
                    <Text style={styles.mapEmptyText}>Añade tu dirección para ver el mapa</Text>
                  </View>
                )}
              </View>

              {/* Service Mode */}
              <Text style={styles.photoTitleLabel}>Modalidad de Servicio</Text>
              <View style={styles.modeRow}>
                {[
                  { value: 'inStore', label: 'Solo en local', icon: 'storefront-outline' },
                  { value: 'homeVisit', label: 'A domicilio', icon: 'home-outline' },
                  { value: 'both', label: 'Ambas', icon: 'git-compare-outline' },
                ].map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={[
                      styles.modeCard,
                      serviceMode === mode.value && styles.modeCardSelected,
                    ]}
                    onPress={() => setServiceMode(mode.value as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={mode.icon as any}
                      size={20}
                      color={serviceMode === mode.value ? PRIMARY : DARK}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        serviceMode === mode.value && styles.modeLabelSelected,
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SECTION 4: HORARIOS DE APERTURA */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Horarios de Apertura</Text>
              {businessHours.map((day) => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek)?.label ?? ''
                return (
                  <View key={day.dayOfWeek} style={styles.dayRow}>
                    <Text style={styles.dayText}>{dayLabel}</Text>
                    
                    <View style={styles.switchWrapper}>
                      <Switch
                        value={day.isOpen}
                        onValueChange={(checked) => handleHoursToggle(day.dayOfWeek, checked)}
                        trackColor={{ true: PRIMARY, false: BORDER }}
                        thumbColor="#FFF"
                      />
                    </View>

                    <View style={styles.timePickersContainer}>
                      {day.isOpen ? (
                        <View style={styles.timePickersRow}>
                          <TouchableOpacity
                            style={styles.timePill}
                            onPress={() => showTimePicker(day.dayOfWeek, 'open')}
                          >
                            <Text style={styles.timePillText}>{day.openTime}</Text>
                          </TouchableOpacity>
                          <Text style={styles.timeDash}>—</Text>
                          <TouchableOpacity
                            style={styles.timePill}
                            onPress={() => showTimePicker(day.dayOfWeek, 'close')}
                          >
                            <Text style={styles.timePillText}>{day.closeTime}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.closedLabel}>Cerrado</Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>

            {/* SECTION 5: AJUSTES DE RESERVA */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Ajustes de Reserva</Text>
              
              <Text style={styles.label}>Duración de slots</Text>
              <View style={[styles.pillsRow, { marginBottom: 16, marginTop: 4 }]}>
                {SLOT_OPTIONS.map(min => {
                  const active = slotDuration === min
                  return (
                    <TouchableOpacity
                      key={min}
                      style={[styles.slotPill, active && styles.dayPillActive]}
                      onPress={() => setSlotDuration(min)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {min} min
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.label}>Zona horaria</Text>
              <View style={[styles.pillsRow, { marginTop: 4 }]}>
                {TIMEZONE_OPTIONS.map(({ label, value }) => {
                  const active = timezone === value
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.tzPill, active && styles.dayPillActive]}
                      onPress={() => setTimezone(value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* DateTimePicker container (iOS and Android conditional) */}
          {Platform.OS === 'ios' ? (
            <Modal
              visible={pickerShow !== null}
              transparent
              animationType="fade"
              onRequestClose={() => {
                setPickerShow(null)
                setIosTempTime(null)
              }}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => {
                      setPickerShow(null)
                      setIosTempTime(null)
                    }}>
                      <Text style={styles.modalCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Seleccionar hora</Text>
                    <TouchableOpacity onPress={() => {
                      if (pickerShow) {
                        const currentPicker = pickerShow
                        const timeStr = iosTempTime || (currentPicker.type === 'open'
                          ? businessHours.find(bh => bh.dayOfWeek === currentPicker.day)?.openTime
                          : businessHours.find(bh => bh.dayOfWeek === currentPicker.day)?.closeTime) || '09:00'
                        setBusinessHours(prev => prev.map(bh => {
                          if (bh.dayOfWeek === currentPicker.day) {
                            return {
                              ...bh,
                              openTime: currentPicker.type === 'open' ? timeStr : bh.openTime,
                              closeTime: currentPicker.type === 'close' ? timeStr : bh.closeTime,
                            }
                          }
                          return bh
                        }))
                      }
                      setPickerShow(null)
                      setIosTempTime(null)
                    }}>
                      <Text style={styles.modalConfirmText}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                  {pickerShow !== null && (
                    <DateTimePicker
                      value={(() => {
                        const timeStr = iosTempTime || (pickerShow.type === 'open'
                          ? businessHours.find(bh => bh.dayOfWeek === pickerShow.day)?.openTime
                          : businessHours.find(bh => bh.dayOfWeek === pickerShow.day)?.closeTime) || '09:00'
                        const [h, m] = timeStr.split(':').map(Number)
                        const d = new Date()
                        d.setHours(h, m, 0, 0)
                        return d
                      })()}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          const hours = String(selectedDate.getHours()).padStart(2, '0')
                          const mins = String(selectedDate.getMinutes()).padStart(2, '0')
                          setIosTempTime(`${hours}:${mins}`)
                        }
                      }}
                      style={{ backgroundColor: '#fff' }}
                    />
                  )}
                </View>
              </View>
            </Modal>
          ) : (
            pickerShow !== null && (
              <DateTimePicker
                value={getDatePickerValue()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={handleTimeChange}
              />
            )
          )}

          {/* Bottom Save Bar */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.btnPrimary, saving && { opacity: 0.7 }]}
              onPress={handleSaveAll}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  headerTitle: { fontFamily: SERIF, fontSize: 18, fontWeight: 'normal', color: DARK },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 18, marginBottom: 14,
  },
  sectionHeader: { fontFamily: SERIF, fontSize: 18, color: DARK, marginBottom: 16 },
  label: { fontFamily: 'System', fontSize: 12, color: GRAY, marginBottom: 6, fontWeight: '500' },
  counter: { fontFamily: MONO, fontSize: 11, color: GRAY },
  input: {
    fontFamily: 'System', height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
    marginBottom: 14, fontWeight: 'normal',
  },
  descriptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  textarea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  photoUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  logoCircleWrapper: { position: 'relative' },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EDE8E4', borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarInitials: { fontSize: 24, fontWeight: '500', color: PRIMARY },
  logoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  photoDescContainer: { flex: 1 },
  photoTitle: { fontFamily: 'System', fontSize: 15, fontWeight: '500', color: DARK },
  photoSub: { fontFamily: 'System', fontSize: 11, color: GRAY, marginTop: 4, lineHeight: 15 },
  photoTitleLabel: { fontFamily: 'System', fontSize: 13, fontWeight: '500', color: DARK, marginTop: 14, marginBottom: 8 },
  coverWrapper: {
    height: 180, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', backgroundColor: SURFACE,
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  coverPlaceholderText: { fontFamily: 'System', fontSize: 12, color: GRAY },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryPhotoWrapper: { position: 'relative', width: 72, height: 72 },
  galleryPhoto: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  photoDeleteBtn: { position: 'absolute', top: -6, right: -6 },
  galleryAddBtn: {
    width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: PRIMARY,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: SURFACE,
  },
  galleryAddText: { fontFamily: 'System', fontSize: 10, color: PRIMARY, fontWeight: '500' },
  autocompleteWrapper: { marginBottom: 14, zIndex: 10, position: 'relative' },
  autocompleteInput: {
    fontFamily: 'System', height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
    fontWeight: 'normal',
  },
  autocompleteList: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: '#fff',
    marginTop: 4, position: 'absolute', top: 48, left: 0, right: 0, zIndex: 999,
  },
  mapContainer: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  map: { width: '100%', height: '100%' },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: SURFACE },
  mapEmptyText: { fontFamily: 'System', fontSize: 12, color: GRAY },
  modeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modeCard: {
    flex: 1, height: 72, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: SURFACE,
  },
  modeCardSelected: { borderColor: PRIMARY, backgroundColor: '#FFF5F2' },
  modeLabel: { fontFamily: 'System', fontSize: 11, color: DARK, fontWeight: '500' },
  modeLabelSelected: { color: PRIMARY },
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  dayText: { width: 90, fontFamily: 'System', fontSize: 14, color: DARK, fontWeight: '500' },
  switchWrapper: { width: 60, alignItems: 'flex-start' },
  timePickersContainer: { flex: 1, alignItems: 'flex-end' },
  closedLabel: { fontFamily: 'System', fontSize: 13, color: GRAY },
  timePickersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timePill: {
    backgroundColor: SURFACE, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER,
  },
  timePillText: { fontFamily: MONO, fontSize: 13, color: DARK },
  timeDash: { color: GRAY, fontSize: 12 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  btnPrimary: {
    height: 48, backgroundColor: PRIMARY, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '500', fontFamily: 'System' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
  },
  modalCancelText: {
    fontSize: 15,
    color: GRAY,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY,
  },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayPillActive: { backgroundColor: PRIMARY },
  dayPillText: { fontSize: 13, fontWeight: '500', color: '#666666' },
  dayPillTextActive: { color: '#fff' },
  slotPill: {
    paddingHorizontal: 16, height: 36, borderRadius: 18,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
  tzPill: {
    paddingHorizontal: 14, height: 36, borderRadius: 18,
    backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center',
  },
})
