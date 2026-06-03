import { View, Text } from 'react-native'

export default function AppointmentsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Mis citas</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — GET /api/client/bookings</Text>
    </View>
  )
}
