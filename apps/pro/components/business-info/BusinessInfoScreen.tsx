import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Switch, Modal, Share,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import MapView, { Marker } from 'react-native-maps'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import DateTimePicker from '@react-native-community/datetimepicker'
import { randomUUID } from 'expo-crypto'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import { ob } from '../../lib/observability'
import { authHeaders, getUploadUrl, SignedUpload, checkSlug, updateSlug } from '../../lib/api'
import { uploadFileToSignedUrl } from '../../lib/storage'
import {
  PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO, SERIF, initials, normalizeSlug, validateSlug,
  getPublicProfileUrl, getPublicProfileDisplay,
} from '../../lib/utils'
import { keys } from '../../hooks/queries'
import { MaxWidthContainer } from '../ui/MaxWidthContainer'
import GallerySection, { fetchBusinessInfo } from './GallerySection'

// Las llamadas a Google Places / Time Zone pasan por nuestro proxy autenticado
// (/api/google/*); la key de Google vive solo en el servidor.
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

interface BusinessHoursState {
  id?: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isOpen: boolean
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

// fetchBusinessInfo vive en GallerySection.tsx (única definición de la query
// keys.businessInfo, compartida con la pantalla /gallery).

export default function BusinessInfoScreen() {
  const queryClient = useQueryClient()
  const businessInfoQuery = useQuery({
    queryKey: keys.businessInfo,
    queryFn: fetchBusinessInfo,
    retry: 1,
  })
  const [saving, setSaving] = useState(false)

  const loading = businessInfoQuery.isLoading && !businessInfoQuery.data
  const businessId: string | null = businessInfoQuery.data?.business?.id ?? null

  // Section 1: General Info
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')

  // Section 1.5: Public profile link (Business.slug — canónico desde 2026-06)
  const [currentSlug, setCurrentSlug] = useState('')
  const [slugEditing, setSlugEditing] = useState(false)
  const [slugInput, setSlugInput] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'unchanged' | 'invalid' | 'checking' | 'available' | 'taken'>('idle')
  const [slugMsg, setSlugMsg] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  // Última normalización enviada al check remoto, para descartar respuestas tardías
  const slugReqRef = useRef('')

  // Section 2: Photos (la galería vive en <GallerySection />, autocontenida)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

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

  // ?focus=photos (p.ej. desde "Galería" en el tab Negocio): al montar, scroll
  // a la sección de fotos. La Y real llega por onLayout de la card de fotos;
  // como la card "Tu enlace" aparece un render después del seed y empuja la
  // sección, seguimos los reajustes de layout durante una ventana corta en
  // lugar de fijar solo el primer Y.
  const { focus } = useLocalSearchParams<{ focus?: string }>()
  const scrollRef = useRef<ScrollView | null>(null)
  const focusDoneRef = useRef(false)
  const focusWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (focusWindowRef.current) clearTimeout(focusWindowRef.current)
  }, [])
  const handlePhotosSectionLayout = (y: number) => {
    if (focus !== 'photos' || focusDoneRef.current) return
    if (!focusWindowRef.current) {
      focusWindowRef.current = setTimeout(() => { focusDoneRef.current = true }, 1200)
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true })
    })
  }

  // El header Authorization debe existir al montar GooglePlacesAutocomplete,
  // así que resolvemos el token antes de renderizarlo.
  const [placesToken, setPlacesToken] = useState<string | null>(null)
  const [addressSearchError, setAddressSearchError] = useState(false)
  const addressRef = useRef('')
  addressRef.current = address

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session?.access_token) {
        setAddressSearchError(true)
        return
      }
      setPlacesToken(session.access_token)
      // Probe: la librería traga respuestas no-200, así que detectamos aquí
      // un proxy sin sesión (401) o sin key configurada (503).
      try {
        const res = await fetch(`${API_URL}/api/google/place/autocomplete/json?language=es`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!cancelled && (res.status === 401 || res.status === 503)) {
          setAddressSearchError(true)
        }
      } catch (e) {
        if (!cancelled) {
          setAddressSearchError(true)
          ob.logError('business-info/places-probe', e)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Si el autocomplete monta después de que el formulario ya se sembró,
  // re-sembramos el texto de la dirección.
  useEffect(() => {
    if (!placesToken) return
    const t = setTimeout(() => placesRef.current?.setAddressText(addressRef.current), 150)
    return () => clearTimeout(t)
  }, [placesToken])

  // Animate map when coordinates change. Si el cambio viene de arrastrar la
  // chincheta no re-centramos: resetearía el zoom con el que se está afinando.
  const dragRef = useRef(false)
  useEffect(() => {
    if (dragRef.current) {
      dragRef.current = false
      return
    }
    if (latitude && longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500)
    }
  }, [latitude, longitude])

  // Seed the form when the query (re)loads. seededRef is reset after a save
  // to refresh the form with server data, mirroring the old loadData() call.
  const seededRef = useRef(false)
  useEffect(() => {
    const data = businessInfoQuery.data
    if (!data || seededRef.current) return
    seededRef.current = true

    const { business, settings, hours } = data
    // El slug público canónico vive en Business.slug; el de settings (User.slug)
    // queda como fallback legacy
    setCurrentSlug(business.slug ?? settings?.slug ?? '')
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
    setSlotDuration(settings?.settings?.slotDuration ?? 30)

    // Map to full 7 days, setting defaults if missing
    const hoursMap = hours.reduce((acc, curr) => {
      acc[curr.dayOfWeek] = curr
      return acc
    }, {} as Record<number, any>)

    setBusinessHours(DAYS_OF_WEEK.map(d => {
      const existing = hoursMap[d.value]
      return {
        id: existing?.id,
        dayOfWeek: d.value,
        openTime: existing?.openTime ? existing.openTime.slice(0, 5) : '09:00',
        closeTime: existing?.closeTime ? existing.closeTime.slice(0, 5) : '18:00',
        isOpen: existing?.isOpen ?? true,
      }
    }))
  }, [businessInfoQuery.data])

  useEffect(() => {
    if (!businessInfoQuery.isError) return
    const msg = businessInfoQuery.error instanceof Error ? businessInfoQuery.error.message : ''
    if (msg === 'NO_BUSINESS') {
      Alert.alert('Error', 'No se encontró el negocio vinculado al usuario')
      router.back()
    } else {
      Alert.alert('Error', msg || 'Error al cargar la información')
    }
  }, [businessInfoQuery.isError])

  // ── Enlace público (slug) ──────────────────────────────────────────────────
  const profileUrl = getPublicProfileUrl(currentSlug)

  const handleShareLink = async () => {
    try {
      await Share.share({ message: profileUrl })
    } catch {
      // hoja de compartir cancelada o no disponible — sin acción
    }
  }

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(profileUrl)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // Validación local instantánea + check remoto con debounce de 500ms
  useEffect(() => {
    if (!slugEditing) return
    if (!slugInput.trim()) {
      setSlugStatus('idle'); setSlugMsg('')
      return
    }
    const normalized = normalizeSlug(slugInput)
    if (normalized === currentSlug.toLowerCase()) {
      setSlugStatus('unchanged'); setSlugMsg('Ese es tu enlace actual.')
      return
    }
    const v = validateSlug(normalized)
    if (!v.ok) {
      setSlugStatus('invalid'); setSlugMsg(v.message)
      return
    }
    setSlugStatus('checking'); setSlugMsg('')
    slugReqRef.current = normalized
    const t = setTimeout(async () => {
      try {
        const res = await checkSlug(normalized)
        if (slugReqRef.current !== normalized) return // respuesta obsoleta
        if (res.available) {
          setSlugStatus('available')
          setSlugMsg(`Disponible: ${getPublicProfileDisplay(res.normalized)}`)
        } else {
          setSlugStatus('taken')
          setSlugMsg(res.reason ?? 'Ese enlace no está disponible.')
        }
      } catch (e) {
        if (slugReqRef.current !== normalized) return
        ob.logError('business-info/slug-check', e)
        setSlugStatus('idle')
        setSlugMsg('No se pudo comprobar la disponibilidad. Intenta de nuevo.')
      }
    }, 500)
    return () => clearTimeout(t)
  }, [slugInput, slugEditing, currentSlug])

  const handleSlugSave = () => {
    const normalized = normalizeSlug(slugInput)
    Alert.alert(
      '¿Cambiar tu enlace?',
      `Tu enlace pasará a ser ${getPublicProfileDisplay(normalized)}. El anterior seguirá redirigiendo aquí, pero el nuevo será el oficial. Podrás cambiarlo de nuevo en 30 días.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            try {
              setSlugSaving(true)
              const updated = await updateSlug(normalized)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              setCurrentSlug(updated.slug)
              setSlugEditing(false)
              setSlugInput('')
              setSlugStatus('idle')
              setSlugMsg('')
              queryClient.invalidateQueries({ queryKey: keys.businessInfo })
              queryClient.invalidateQueries({ queryKey: keys.settings })
            } catch (err: any) {
              // El servidor responde mensajes específicos (ocupado, cooldown con fecha…)
              Alert.alert('No se pudo cambiar el enlace', err?.message || 'Error inesperado')
            } finally {
              setSlugSaving(false)
            }
          },
        },
      ]
    )
  }

  const pickImage = async (target: 'logo' | 'cover') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar las imágenes')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: target === 'logo' ? [1, 1] : [16, 9],
      quality: 0.8,
    })

    if (result.canceled || !result.assets?.[0]?.uri) return

    const localUri = result.assets[0].uri
    uploadPhoto(localUri, target)
  }

  // Subida vía signed URL de la API: el cliente de Storage de supabase-js no
  // adjunta la sesión en móvil, así que la autorización viaja en el token
  // firmado que emite el servidor (que además decide la ruta).
  const uploadPhoto = async (uri: string, target: 'logo' | 'cover') => {
    if (!businessId) return
    try {
      setSaving(true)
      const rawExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileExt = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg'

      let signed: SignedUpload
      try {
        signed = await getUploadUrl(target, fileExt)
      } catch (err: any) {
        ob.logError('business-info/upload-url', err)
        Alert.alert('Error de subida', 'No se pudo autorizar la subida. Intenta de nuevo.')
        return
      }

      try {
        const contentType = `image/${fileExt === 'png' ? 'png' : fileExt === 'webp' ? 'webp' : 'jpeg'}`
        await uploadFileToSignedUrl(signed, uri, contentType)
      } catch (err: any) {
        ob.logError('business-info/upload', err)
        Alert.alert('Error de subida', err?.message === 'EMPTY_FILE'
          ? 'No se pudo leer la imagen seleccionada'
          : 'La imagen no se pudo subir. Revisa tu conexión e intenta de nuevo.')
        return
      }

      const publicUrl = signed.publicUrl

      // Persistencia inmediata: la foto queda guardada sin pulsar "Guardar"
      const { error: dbError } = await supabase
        .from('Business')
        .update(target === 'logo' ? { logoUrl: publicUrl } : { coverUrl: publicUrl })
        .eq('id', businessId)
      if (dbError) {
        ob.logError('business-info/photo-persist', dbError)
        Alert.alert('Error', 'La imagen se subió pero no se pudo guardar. Pulsa "Guardar cambios" para reintentar.')
      }
      if (target === 'logo') setLogoUrl(publicUrl)
      else setCoverUrl(publicUrl)

      queryClient.invalidateQueries({ queryKey: keys.businessInfo })
    } catch (err: any) {
      Alert.alert('Error de subida', err.message || 'No se pudo subir la imagen')
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
          address: (placesRef.current?.getAddressText() || address || '').trim() || null,
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

      // Refresh everything that renders business data, hours or timezone
      queryClient.invalidateQueries({ queryKey: keys.settings })
      queryClient.invalidateQueries({ queryKey: keys.dashboard })
      queryClient.invalidateQueries({ queryKey: keys.appointments.all })

      Alert.alert('Éxito', 'Configuración del negocio guardada correctamente')
      seededRef.current = false
      queryClient.invalidateQueries({ queryKey: keys.businessInfo })
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
      <MaxWidthContainer>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back-outline" size={24} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil del negocio</Text>
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
              ref={scrollRef}
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

              {/* SECTION 1.5: TU ENLACE */}
              {currentSlug ? (
                <View style={styles.card}>
                  <Text style={styles.sectionHeader}>Tu enlace</Text>
                  <Text style={styles.photoSectionSub}>
                    El enlace público de tu negocio. Compártelo en tu bio de Instagram y tus tarjetas — tus clientas reservan desde aquí.
                  </Text>

                  <View style={styles.slugLinkRow}>
                    <Text style={styles.slugLinkText} numberOfLines={1}>
                      {getPublicProfileDisplay(currentSlug)}
                    </Text>
                  </View>

                  <View style={styles.slugActionsRow}>
                    <TouchableOpacity style={styles.slugShareBtn} onPress={handleShareLink} activeOpacity={0.85}>
                      <Ionicons name="share-outline" size={16} color="#FFF" />
                      <Text style={styles.slugShareText}>Compartir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.slugCopyBtn} onPress={handleCopyLink} activeOpacity={0.85}>
                      <Ionicons name={linkCopied ? 'checkmark-outline' : 'copy-outline'} size={16} color={PRIMARY} />
                      <Text style={styles.slugCopyText}>{linkCopied ? 'Copiado' : 'Copiar'}</Text>
                    </TouchableOpacity>
                  </View>

                  {!slugEditing ? (
                    <TouchableOpacity
                      style={styles.slugEditToggle}
                      onPress={() => { setSlugEditing(true); setSlugInput('') }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil-outline" size={13} color={GRAY} />
                      <Text style={styles.slugEditToggleText}>Personalizar enlace</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.slugEditor}>
                      <Text style={styles.label}>Nuevo enlace</Text>
                      <View style={styles.slugInputRow}>
                        <Text style={styles.slugPrefix}>{getPublicProfileDisplay('')}</Text>
                        <TextInput
                          style={styles.slugInput}
                          value={slugInput}
                          onChangeText={setSlugInput}
                          placeholder="tunegocio"
                          placeholderTextColor="#AAAAAA"
                          autoCapitalize="none"
                          autoCorrect={false}
                          maxLength={40}
                        />
                        {slugStatus === 'checking' && <ActivityIndicator size="small" color={GRAY} />}
                        {slugStatus === 'available' && <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />}
                        {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                          <Ionicons name="close-circle" size={20} color="#D32F2F" />
                        )}
                      </View>
                      {slugMsg ? (
                        <Text style={[
                          styles.slugStatusText,
                          slugStatus === 'available' && { color: '#2E7D32' },
                          (slugStatus === 'taken' || slugStatus === 'invalid') && { color: '#D32F2F' },
                        ]}>
                          {slugMsg}
                        </Text>
                      ) : null}
                      <Text style={styles.slugNotice}>
                        Tu enlace anterior seguirá redirigiendo aquí, pero el nuevo será el oficial.
                        Podrás cambiarlo de nuevo en 30 días.
                      </Text>
                      <View style={styles.slugEditorActions}>
                        <TouchableOpacity
                          style={styles.slugCancelBtn}
                          onPress={() => {
                            setSlugEditing(false); setSlugInput(''); setSlugStatus('idle'); setSlugMsg('')
                          }}
                          disabled={slugSaving}
                        >
                          <Text style={styles.slugCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.slugSaveBtn,
                            (slugStatus !== 'available' || slugSaving) && { opacity: 0.5 },
                          ]}
                          onPress={handleSlugSave}
                          disabled={slugStatus !== 'available' || slugSaving}
                          activeOpacity={0.85}
                        >
                          {slugSaving ? (
                            <ActivityIndicator color="#FFF" size="small" />
                          ) : (
                            <Text style={styles.slugSaveText}>Guardar enlace</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ) : null}

              {/* SECTION 2: FOTOS */}
              <View
                style={styles.card}
                onLayout={e => handlePhotosSectionLayout(e.nativeEvent.layout.y)}
              >
                <Text style={styles.sectionHeader}>Fotos</Text>

                {/* Logo selection */}
                <View style={styles.photoUploadRow}>
                  <View style={styles.logoCircleWrapper}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.logoCircle} cachePolicy="memory-disk" transition={100} />
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
                    <Text style={styles.photoTitle}>Logo del negocio</Text>
                    <Text style={styles.photoSub}>Tu marca en búsquedas y reservas. Imagen cuadrada recomendada.</Text>
                  </View>
                </View>

                {/* Cover Photo */}
                <Text style={styles.photoTitleLabel}>Foto de portada</Text>
                <Text style={styles.photoSectionSub}>La primera imagen que ven tus clientas al abrir tu perfil.</Text>
                <TouchableOpacity style={styles.coverWrapper} onPress={() => pickImage('cover')} activeOpacity={0.9}>
                  {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.coverImage} cachePolicy="memory-disk" transition={100} />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <Ionicons name="image-outline" size={32} color={GRAY} />
                      <Text style={styles.coverPlaceholderText}>Seleccionar banner horizontal (16:9)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Place Gallery (componente compartido con /gallery) */}
                <GallerySection />
              </View>

              {/* SECTION 3: LOCALIZACIÓN Y MODALIDAD */}
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>Localización y Modalidad</Text>

                <Text style={styles.label}>Dirección física del negocio</Text>
                <View style={styles.autocompleteWrapper}>
                  {placesToken ? (
                    <GooglePlacesAutocomplete
                      ref={placesRef}
                      keyboardShouldPersistTaps="handled"
                      placeholder="Busca la dirección..."
                      fetchDetails={true}
                      requestUrl={{
                        useOnPlatform: 'all',
                        url: `${API_URL}/api/google`,
                        headers: { Authorization: `Bearer ${placesToken}` },
                      }}
                      onPress={async (data, details = null) => {
                        if (!details) {
                          // fetchDetails está activo: details null = fallo de Place Details
                          ob.logError('business-info/place-details', new Error(`details null para "${data?.description ?? ''}"`))
                          setAddressSearchError(true)
                          return
                        }
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
                        setAddressSearchError(false)

                        // Timezone vía proxy; si falla se conserva la actual
                        try {
                          const headers = await authHeaders()
                          if (headers) {
                            const tzRes = await fetch(
                              `${API_URL}/api/google/timezone?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}`,
                              { headers }
                            )
                            const tzData = await tzRes.json()
                            if (tzData.timeZoneId) {
                              setTimezone(tzData.timeZoneId)
                            }
                          }
                        } catch (e) {
                          ob.logError('business-info/timezone', e)
                        }
                      }}
                      query={{
                        // La librería exige key no vacía; el proxy la ignora
                        // (no está en la whitelist) y usa la key del servidor.
                        key: 'proxied',
                        language: 'es',
                        components: 'country:ve|country:es|country:mx|country:co',
                      }}
                      onFail={(error) => {
                        ob.logError('business-info/places', error)
                        setAddressSearchError(true)
                      }}
                      styles={{
                        textInput: styles.autocompleteInput,
                        container: { flex: 0 },
                        listView: styles.autocompleteList,
                      }}
                      textInputProps={{
                        placeholderTextColor: '#AAAAAA',
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.autocompleteInput}
                      value={address}
                      editable={false}
                      placeholder="Busca la dirección..."
                      placeholderTextColor="#AAAAAA"
                    />
                  )}
                </View>
                {addressSearchError && (
                  <Text style={styles.searchErrorText}>
                    No se pudo buscar la dirección. Intenta de nuevo.
                  </Text>
                )}

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
                      <Marker
                        coordinate={{ latitude, longitude }}
                        draggable
                        onDragEnd={(e) => {
                          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate
                          dragRef.current = true
                          setLatitude(lat)
                          setLongitude(lng)
                        }}
                      />
                    </MapView>
                  ) : (
                    <View style={styles.mapEmpty}>
                      <Ionicons name="map-outline" size={28} color={GRAY} />
                      <Text style={styles.mapEmptyText}>Añade tu dirección para ver el mapa</Text>
                    </View>
                  )}
                </View>
                {latitude && longitude ? (
                  <Text style={styles.mapHint}>
                    Mantén pulsada la chincheta y arrástrala para ajustar la ubicación exacta
                  </Text>
                ) : null}

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
      </MaxWidthContainer>
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
  photoSectionSub: { fontFamily: 'System', fontSize: 11, color: GRAY, lineHeight: 15, marginTop: -4, marginBottom: 8 },
  coverWrapper: {
    height: 180, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', backgroundColor: SURFACE,
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  coverPlaceholderText: { fontFamily: 'System', fontSize: 12, color: GRAY },
  autocompleteWrapper: { marginBottom: 14 },
  searchErrorText: { fontFamily: 'System', fontSize: 11, color: '#D32F2F', marginTop: -8, marginBottom: 12 },
  autocompleteInput: {
    fontFamily: 'System', height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 15, color: DARK, backgroundColor: SURFACE,
    fontWeight: 'normal',
  },
  // En flujo (no absolute): en RN los toques fuera de los bounds del padre no
  // se registran, así que una lista absoluta bajo un wrapper de 48px se ve
  // pero no recibe taps. En flujo empuja el layout y todo es tocable.
  autocompleteList: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: '#fff',
    marginTop: 4,
  },
  mapContainer: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, marginBottom: 6 },
  mapHint: { fontFamily: 'System', fontSize: 11, color: GRAY, marginBottom: 14, lineHeight: 15 },
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
  slugLinkRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 48,
  },
  slugLinkText: { flex: 1, fontFamily: MONO, fontSize: 14, color: DARK },
  slugActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  slugShareBtn: {
    flex: 1, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  slugShareText: { color: '#FFF', fontSize: 14, fontWeight: '500', fontFamily: 'System' },
  slugCopyBtn: {
    flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFF',
  },
  slugCopyText: { color: PRIMARY, fontSize: 14, fontWeight: '500', fontFamily: 'System' },
  slugEditToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginTop: 14,
  },
  slugEditToggleText: { fontFamily: 'System', fontSize: 12, color: GRAY, fontWeight: '500' },
  slugEditor: {
    marginTop: 16, paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
  },
  slugInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 48, backgroundColor: SURFACE,
  },
  slugPrefix: { fontFamily: MONO, fontSize: 13, color: GRAY },
  slugInput: { flex: 1, fontFamily: MONO, fontSize: 14, color: DARK, height: '100%', padding: 0 },
  slugStatusText: { fontFamily: 'System', fontSize: 11, color: GRAY, marginTop: 6, lineHeight: 15 },
  slugNotice: { fontFamily: 'System', fontSize: 11, color: GRAY, marginTop: 10, lineHeight: 15 },
  slugEditorActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  slugCancelBtn: {
    flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF',
  },
  slugCancelText: { color: GRAY, fontSize: 14, fontWeight: '500', fontFamily: 'System' },
  slugSaveBtn: {
    flex: 1, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  slugSaveText: { color: '#FFF', fontSize: 14, fontWeight: '500', fontFamily: 'System' },
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
