import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { getClientToken } from '../lib/clientAuth'

export default function Index() {
  const [token, setToken] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    getClientToken().then(setToken)
  }, [])

  if (token === undefined) return null

  return token ? <Redirect href="/(tabs)/explore" /> : <Redirect href="/(auth)/verify" />
}
