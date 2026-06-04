import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function EmailLoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function signIn() {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (authError) throw authError
      // _layout.tsx detecta la sesión y redirige automáticamente
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={DARK} />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>con tu correo electrónico</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor="#AAAAAA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={signIn}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999999"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={signIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.btnText}>Entrar</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const PRIMARY = '#B5593E'
const DARK = '#34271E'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  back: {
    marginTop: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    marginTop: 32,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: DARK,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
  },
  form: {
    gap: 4,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E0DC',
    paddingHorizontal: 16,
    fontSize: 15,
    color: DARK,
    backgroundColor: '#FAFAF9',
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  btnPrimary: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
})
