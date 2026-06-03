import { getClientToken } from './clientAuth'

const BASE = process.env.EXPO_PUBLIC_API_URL!

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getClientToken()
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}
