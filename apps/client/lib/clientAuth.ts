import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const CLIENT_TOKEN_KEY = 'musa_client_token'

export async function verifyClient(phone: string, name: string): Promise<string | null> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name }),
  })
  if (!res.ok) return null
  const { token } = await res.json()
  try {
    await SecureStore.setItemAsync(CLIENT_TOKEN_KEY, token)
    await AsyncStorage.removeItem(CLIENT_TOKEN_KEY).catch(() => {})
  } catch (error) {
    console.error('[verifyClient Storage Error]:', error)
    // Fallback de contingencia si SecureStore falla
    await AsyncStorage.setItem(CLIENT_TOKEN_KEY, token).catch(() => {})
  }
  return token
}

export async function getClientToken(): Promise<string | null> {
  try {
    const secureToken = await SecureStore.getItemAsync(CLIENT_TOKEN_KEY)
    if (secureToken) return secureToken

    const legacyToken = await AsyncStorage.getItem(CLIENT_TOKEN_KEY)
    if (legacyToken) {
      await SecureStore.setItemAsync(CLIENT_TOKEN_KEY, legacyToken)
      await AsyncStorage.removeItem(CLIENT_TOKEN_KEY)
      return legacyToken
    }
  } catch (error) {
    console.error('[getClientToken Storage Error]:', error)
  }
  return null
}

export async function clearClientToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLIENT_TOKEN_KEY)
  } catch (error) {
    console.error('[clearClientToken Storage Error]:', error)
  }
  await AsyncStorage.removeItem(CLIENT_TOKEN_KEY).catch(() => {})
}
