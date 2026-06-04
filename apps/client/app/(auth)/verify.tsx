import { View, Text } from 'react-native'

export default function VerifyScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>MUSA — Verificar identidad</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — POST /api/client/verify</Text>
    </View>
  )
}
