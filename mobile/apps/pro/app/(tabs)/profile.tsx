import { View, Text } from 'react-native'

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Mi Perfil</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — GET/PATCH /api/profile</Text>
    </View>
  )
}
