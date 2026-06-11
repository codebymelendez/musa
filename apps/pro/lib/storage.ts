// Transporte de archivos a Supabase Storage vía signed upload URLs.
// fetch(uri).blob() sobre file:// produce blobs de 0 bytes en RN/Hermes, así
// que subimos con FileSystem.uploadAsync, que lee el archivo nativamente desde
// disco sin pasar el binario por JS.
// (En expo-file-system 19+ la API clásica vive en 'expo-file-system/legacy'.)

import * as FileSystem from 'expo-file-system/legacy'
import type { SignedUpload } from './api'

export async function uploadFileToSignedUrl(
  signed: SignedUpload,
  localUri: string,
  contentType: string,
): Promise<void> {
  // Anti-0-bytes: algunos URIs del picker no son legibles como archivo
  const info = await FileSystem.getInfoAsync(localUri)
  if (!info.exists || (info.size ?? 0) === 0) {
    throw new Error('EMPTY_FILE')
  }

  // createSignedUploadUrl ya incluye ?token= en la signedUrl; el fallback
  // cubre el caso de que algún día venga sin él.
  const url = signed.signedUrl.includes('token=')
    ? signed.signedUrl
    : `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(signed.token)}`

  const result = await FileSystem.uploadAsync(url, localUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
  })

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed (${result.status}): ${result.body?.slice(0, 300) ?? ''}`)
  }
}
