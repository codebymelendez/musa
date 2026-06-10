import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { supabase } from '../lib/supabase'
import { queryClient, asyncStoragePersister, shouldDehydrateQuery } from '../lib/queryClient'
import type { Session } from '@supabase/supabase-js'

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
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  )
}
