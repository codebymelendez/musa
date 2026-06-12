import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as Application from 'expo-application'
import Constants from 'expo-constants'
import { randomUUID } from 'expo-crypto'
import { router } from 'expo-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Mostrar la notificación también con la app en foreground (banner + lista + sonido)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Token del dispositivo en esta sesión de app — lo usa el logout para borrar
// SOLO la fila de este dispositivo (la usuaria puede tener iPhone y iPad).
let currentToken: string | null = null

async function getDevicePushToken(): Promise<string | null> {
  if (!Device.isDevice) return null // emuladores/simuladores no tienen push

  // En Android 8+ el channel debe existir ANTES de pedir el token
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B5593E',
    })
  }

  let { status } = await Notifications.getPermissionsAsync()
  if (status === 'undetermined') {
    ;({ status } = await Notifications.requestPermissionsAsync())
  }
  if (status !== 'granted') return null

  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    console.error('[push] extra.eas.projectId no configurado en app.json')
    return null
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  return token
}

// Idempotente (SELECT → UPDATE/INSERT): se llama tras login y en cada
// arranque con sesión activa.
export async function registerPushToken(userId: string): Promise<void> {
  try {
    const token = await getDevicePushToken()
    if (!token) return
    currentToken = token

    const appVersion = Application.nativeApplicationVersion

    // Sin unique constraint en fcmToken: limit(1) en vez de maybeSingle()
    const { data: existing } = await supabase
      .from('PushSubscription')
      .select('id')
      .eq('fcmToken', token)
      .limit(1)

    if (existing && existing.length > 0) {
      // El token ya está registrado: refrescar dueño (pudo cambiar la sesión)
      await supabase
        .from('PushSubscription')
        .update({ userId, appVersion })
        .eq('id', existing[0].id)
    } else {
      await supabase.from('PushSubscription').insert({
        // LECCIÓN BusinessHours: generar el id en la app, no omitirlo
        id: randomUUID(),
        userId,
        platform: Platform.OS, // 'ios' | 'android'
        fcmToken: token,
        deviceModel: Device.modelName,
        appVersion,
        endpoint: null, // solo web (VAPID)
        keys: null, // solo web (VAPID)
      })
    }
  } catch (err) {
    console.error('[push] registro fallido:', err)
  }
}

// Llamar ANTES de supabase.auth.signOut() (el DELETE necesita la sesión).
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = currentToken ?? (await getDevicePushToken())
    if (!token) return
    await supabase.from('PushSubscription').delete().eq('fcmToken', token)
    currentToken = null
  } catch (err) {
    console.error('[push] baja de token fallida:', err)
  }
}

// Evitar doble navegación cuando el listener y getLastNotificationResponseAsync
// reportan la misma respuesta (apertura en frío)
let lastHandledResponseId: string | null = null

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const id = response.notification.request.identifier
  if (id && id === lastHandledResponseId) return
  lastHandledResponseId = id

  const data = response.notification.request.content.data as
    | { appointmentId?: string }
    | undefined
  if (data?.appointmentId) {
    router.push(`/appointments/${data.appointmentId}` as Parameters<typeof router.push>[0])
  }
}

export function usePushNotifications(session: Session | null | undefined) {
  const userId = session?.user?.id

  // Registro tras login y en cada arranque con sesión activa
  useEffect(() => {
    if (!userId) return
    registerPushToken(userId)
  }, [userId])

  // Tap en notificación → detalle de la cita
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    // Apertura en frío: la respuesta llegó antes de montar el listener.
    // Pequeño delay para que el Stack y el redirect de auth ya estén montados.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        setTimeout(() => handleNotificationResponse(response), 800)
      }
    })

    return () => sub.remove()
  }, [])
}
