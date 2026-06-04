import { View, Text } from 'react-native'

export default function ClientsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Clientas</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — GET /api/clients</Text>
    </View>
  )
}
