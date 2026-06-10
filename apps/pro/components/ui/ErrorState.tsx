import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PRIMARY } from '../../lib/utils'

export default function ErrorState({
  message = 'No se pudo cargar la información',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <View style={s.wrap}>
      <Ionicons name="cloud-offline-outline" size={44} color="#CCCCCC" />
      <Text style={s.message}>{message}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={s.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32, paddingBottom: 40 },
  message: { fontSize: 15, color: '#888888', textAlign: 'center' },
  retryBtn: { height: 48, paddingHorizontal: 36, backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.2 },
})
