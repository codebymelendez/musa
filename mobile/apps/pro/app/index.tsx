import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Index() {
  const [session, setSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === null) return null

  return session ? <Redirect href="/(tabs)/calendar" /> : <Redirect href="/(auth)/login" />
}
