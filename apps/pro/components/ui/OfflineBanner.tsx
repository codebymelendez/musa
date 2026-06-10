import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'

/**
 * Banner discreto que aparece cuando el dispositivo pierde conexión.
 * La app sigue siendo consultable gracias al caché persistido de React Query.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected ?? true))
    })
  }, [])

  if (!offline) return null

  return (
    <View style={[s.banner, { paddingTop: insets.top + 6 }]}>
      <Ionicons name="cloud-offline-outline" size={14} color="#8F6B00" />
      <Text style={s.text}>Sin conexión — mostrando datos guardados</Text>
    </View>
  )
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFF9EB', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFE7B3',
    paddingVertical: 6, paddingHorizontal: 16,
  },
  text: { fontSize: 12, color: '#8F6B00' },
})
