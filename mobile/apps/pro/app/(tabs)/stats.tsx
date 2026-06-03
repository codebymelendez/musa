import { View, Text } from 'react-native'

export default function StatsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Estadísticas</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — GET /api/stats</Text>
    </View>
  )
}
