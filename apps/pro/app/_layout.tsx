import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../lib/supabase'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { queryClient, asyncStoragePersister, shouldDehydrateQuery } from '../lib/queryClient'
import ErrorBoundary from '../components/ui/ErrorBoundary'
import OfflineBanner from '../components/ui/OfflineBanner'
import type { Session } from '@supabase/supabase-js'

// React Query pausa los fetch cuando no hay red y los reanuda al reconectar;
// el caché persistido mantiene la app consultable sin conexión.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(!!state.isConnected))
)

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 24 * 60 * 60 * 1000,
  dehydrateOptions: { shouldDehydrateQuery },
}

export default function RootLayout() {
  // undefined = cargando, null = sin sesión, Session = autenticado
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const router = useRouter()
  const segments = useSegments()

  // Registro de push token (login + arranque) y navegación al tocar notificaciones
  usePushNotifications(session)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return

    const inAuth = segments[0] === '(auth)'

    if (session && inAuth) {
      router.replace('/')
    } else if (!session && !inAuth) {
      router.replace('/(auth)/login')
    }
  }, [session, segments])

  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#B5593E" />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <SafeAreaProvider>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  )
}
