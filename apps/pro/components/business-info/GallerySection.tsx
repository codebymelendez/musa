import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import { ob } from '../../lib/observability'
import { getSettings, getUploadUrl, deleteStoragePhoto, SignedUpload } from '../../lib/api'
import { uploadFileToSignedUrl } from '../../lib/storage'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, MONO } from '../../lib/utils'
import { keys } from '../../hooks/queries'

const MAX_GALLERY_PHOTOS = 6

export interface BusinessPhotoItem {
  id: string
  url: string
  sortOrder: number
}

// Multi-source load for the business edit form: settings (for businessId + slot
// duration) plus Business row, gallery photos and business hours. Vive aquí
// para que la query keys.businessInfo tenga una única definición compartida
// entre BusinessInfoScreen y la pantalla /gallery.
export async function fetchBusinessInfo() {
  const settings = await getSettings()
  const bId = settings?.businessId
  if (!bId) throw new Error('NO_BUSINESS')

  const { data: business, error: bError } = await supabase
    .from('Business')
    .select('*')
    .eq('id', bId)
    .single()
  if (bError || !business) {
    throw new Error(bError?.message ?? 'No se pudo cargar el negocio')
  }

  const { data: photos } = await supabase
    .from('BusinessPhoto')
    .select('*')
    .eq('businessId', bId)
    .eq('type', 'gallery')
    .order('sortOrder', { ascending: true })

  const { data: hours } = await supabase
    .from('BusinessHours')
    .select('*')
    .eq('businessId', bId)
    .is('userId', null)

  return { settings, business, photos: photos ?? [], hours: hours ?? [] }
}

// Galería del negocio, autocontenida: misma query (keys.businessInfo), subida
// vía signed URLs y borrado con invalidación — montarla en cualquier pantalla
// mantiene los datos sincronizados entre todas.
export default function GallerySection({ showHeading = true }: { showHeading?: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: keys.businessInfo,
    queryFn: fetchBusinessInfo,
    retry: 1,
  })
  const businessId: string | null = query.data?.business?.id ?? null
  const photos: BusinessPhotoItem[] = (query.data?.photos ?? []).map((p: any) => ({
    id: p.id,
    url: p.url,
    sortOrder: p.sortOrder,
  }))
  const [busy, setBusy] = useState(false)

  // Refleja el cambio en caché de inmediato y revalida; cualquier otra
  // pantalla montada sobre keys.businessInfo se actualiza sola.
  const syncPhotosCache = (updater: (current: any[]) => any[]) => {
    queryClient.setQueryData(keys.businessInfo, (old: any) =>
      old ? { ...old, photos: updater(old.photos ?? []) } : old
    )
    queryClient.invalidateQueries({ queryKey: keys.businessInfo })
  }

  const pickAndUpload = async () => {
    if (!businessId || busy) return
    if (photos.length >= MAX_GALLERY_PHOTOS) {
      Alert.alert('Límite alcanzado', `Puedes subir un máximo de ${MAX_GALLERY_PHOTOS} fotos a la galería`)
      return
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar las imágenes')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]?.uri) return
    const uri = result.assets[0].uri

    // Subida vía signed URL de la API: el cliente de Storage de supabase-js no
    // adjunta la sesión en móvil, así que la autorización viaja en el token
    // firmado que emite el servidor (que además decide la ruta).
    try {
      setBusy(true)
      const rawExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileExt = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg'

      let signed: SignedUpload
      try {
        signed = await getUploadUrl('gallery', fileExt)
      } catch (err: any) {
        ob.logError('gallery/upload-url', err)
        Alert.alert('Error de subida', 'No se pudo autorizar la subida. Intenta de nuevo.')
        return
      }

      try {
        const contentType = `image/${fileExt === 'png' ? 'png' : fileExt === 'webp' ? 'webp' : 'jpeg'}`
        await uploadFileToSignedUrl(signed, uri, contentType)
      } catch (err: any) {
        ob.logError('gallery/upload', err)
        Alert.alert('Error de subida', err?.message === 'EMPTY_FILE'
          ? 'No se pudo leer la imagen seleccionada'
          : 'La imagen no se pudo subir. Revisa tu conexión e intenta de nuevo.')
        return
      }

      const { data: newPhoto, error: dbError } = await supabase
        .from('BusinessPhoto')
        .insert({
          businessId,
          url: signed.publicUrl,
          type: 'gallery',
          sortOrder: photos.length,
        })
        .select()
        .single()

      if (dbError) throw dbError

      syncPhotosCache(current => [...current, newPhoto])
    } catch (err: any) {
      Alert.alert('Error de subida', err.message || 'No se pudo subir la imagen')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = async (photo: BusinessPhotoItem) => {
    if (busy) return
    // La API de borrado pide el path dentro del bucket; lo derivamos del
    // publicUrl (…/storage/v1/object/public/business-photos/<path>).
    const marker = '/storage/v1/object/public/business-photos/'
    const idx = photo.url.indexOf(marker)
    if (idx === -1) {
      Alert.alert('Error', 'No se pudo identificar la imagen a eliminar')
      return
    }
    const path = decodeURIComponent(photo.url.slice(idx + marker.length))
    try {
      setBusy(true)
      await deleteStoragePhoto(path)
      syncPhotosCache(current => current.filter((p: any) => p.id !== photo.id))
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo eliminar la imagen')
    } finally {
      setBusy(false)
    }
  }

  if (query.isLoading && !query.data) {
    return <ActivityIndicator color={PRIMARY} style={{ marginVertical: 24 }} />
  }

  if (query.isError && !query.data) {
    return (
      <TouchableOpacity onPress={() => query.refetch()} activeOpacity={0.75}>
        <Text style={st.errorText}>No se pudo cargar la galería. Toca para reintentar.</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View>
      {showHeading ? (
        <>
          <View style={st.galleryHeader}>
            <Text style={st.photoTitleLabel}>Galería del lugar</Text>
            <Text style={st.counter}>{photos.length} / {MAX_GALLERY_PHOTOS}</Text>
          </View>
          <Text style={st.photoSectionSub}>Muestra tu local y tus trabajos — esto verán tus clientas.</Text>
        </>
      ) : (
        <Text style={[st.counter, st.counterAlone]}>{photos.length} / {MAX_GALLERY_PHOTOS}</Text>
      )}
      <View style={st.galleryGrid}>
        {photos.map(photo => (
          <View key={photo.id} style={st.galleryPhotoWrapper}>
            <Image source={{ uri: photo.url }} style={st.galleryPhoto} cachePolicy="memory-disk" transition={100} recyclingKey={photo.id} />
            <TouchableOpacity style={st.photoDeleteBtn} onPress={() => removePhoto(photo)}>
              <Ionicons name="close-circle" size={18} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_GALLERY_PHOTOS && (
          <TouchableOpacity style={st.galleryAddBtn} onPress={pickAndUpload} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <>
                <Ionicons name="add-outline" size={24} color={PRIMARY} />
                <Text style={st.galleryAddText}>Añadir</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  photoTitleLabel: { fontFamily: 'System', fontSize: 13, fontWeight: '500', color: DARK },
  photoSectionSub: { fontFamily: 'System', fontSize: 11, color: GRAY, lineHeight: 15, marginTop: -4, marginBottom: 8 },
  counter: { fontFamily: MONO, fontSize: 11, color: GRAY },
  counterAlone: { alignSelf: 'flex-end', marginBottom: 8 },
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
  errorText: { fontFamily: 'System', fontSize: 12, color: '#D32F2F', marginVertical: 16 },
})
