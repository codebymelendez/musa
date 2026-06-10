import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { MaxWidthContainer } from '../../components/ui/MaxWidthContainer'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle() {
    try {
      setLoading(true)
      setError(null)

      // Expo Go no registra schemes nativos — usa exp+<slug>://
      // El build standalone usa el scheme real: getmusa-pro://
      const scheme = __DEV__ ? 'exp+getmusa-pro' : 'getmusa-pro'
      const redirectUrl = makeRedirectUri({ scheme })

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (oauthError) throw oauthError
      if (!data.url) throw new Error('No URL de OAuth')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

      if (result.type === 'success') {
        // Supabase devuelve tokens en el fragment: #access_token=...&refresh_token=...
        const fragment = result.url.split('#')[1] ?? ''
        const params = new URLSearchParams(fragment)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (sessionError) throw sessionError
          // onAuthStateChange en _layout.tsx detecta la sesión y redirige a /(tabs)/calendar
        } else {
          throw new Error('Tokens no encontrados en la respuesta')
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setError('La autenticación fue cancelada.')
      }
    } catch {
      setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <MaxWidthContainer>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <Text style={styles.logo}>MUSA Pro</Text>
            <Text style={styles.subtitle}>Gestiona tu negocio de belleza</Text>
          </View>

          {/* Acciones */}
          <View style={styles.actions}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={signInWithGoogle}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>Continuar con Google</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.push('/(auth)/email')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Entrar con email</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </MaxWidthContainer>
    </SafeAreaView>
  )
}

const PRIMARY = '#B5593E'
const DARK = '#34271E'

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 54,
    // Georgia es el serif de sistema más cercano a Cormorant en iOS/Android
    // Reemplazar por { fontFamily: 'Cormorant_400Regular' } al instalar expo-google-fonts
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: PRIMARY,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  btnPrimary: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDDDDD',
  },
  dividerLabel: {
    color: '#999999',
    fontSize: 14,
  },
  btnSecondary: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: DARK,
    fontSize: 16,
    fontWeight: '500',
  },
})
