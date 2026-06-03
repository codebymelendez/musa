import AsyncStorage from '@react-native-async-storage/async-storage'

const CLIENT_TOKEN_KEY = 'musa_client_token'

export async function verifyClient(phone: string, name: string): Promise<string | null> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name }),
  })
  if (!res.ok) return null
  const { token } = await res.json()
  await AsyncStorage.setItem(CLIENT_TOKEN_KEY, token)
  return token
}

export async function getClientToken(): Promise<string | null> {
  return AsyncStorage.getItem(CLIENT_TOKEN_KEY)
}

export async function clearClientToken(): Promise<void> {
  return AsyncStorage.removeItem(CLIENT_TOKEN_KEY)
}
