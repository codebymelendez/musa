import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'
import { ob } from './observability'

// Adaptador seguro e híbrido con migración transparente y compatible hacia atrás
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // 1. Intentar leer de SecureStore
      const secureValue = await SecureStore.getItemAsync(key)
      if (secureValue) return secureValue

      // 2. Si no está en SecureStore, intentar leer de AsyncStorage
      const asyncValue = await AsyncStorage.getItem(key)
      if (asyncValue) {
        // Guardar de forma segura en SecureStore
        await SecureStore.setItemAsync(key, asyncValue)
        // Limpiar la clave no segura
        await AsyncStorage.removeItem(key)
        ob.debug(`[secureStorage] Migración exitosa de la clave "${key}" a SecureStore.`)
        return asyncValue
      }
    } catch (error) {
      console.error('[secureStorage error (getItem)]:', error)
    }
    return null
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (error) {
      console.error('[secureStorage error (setItem)]:', error)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key)
      await AsyncStorage.removeItem(key).catch(() => {})
    } catch (error) {
      console.error('[secureStorage error (removeItem)]:', error)
    }
  }
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // CRÍTICO: false en React Native
    },
  }
)

// Refrescar sesión cuando la app vuelve al foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
