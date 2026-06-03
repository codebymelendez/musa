import { View, Text } from 'react-native'

export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Explorar profesionales</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — GET /api/public/businesses</Text>
    </View>
  )
}
