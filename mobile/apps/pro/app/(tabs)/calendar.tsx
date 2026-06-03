import { View, Text } from 'react-native'

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Agenda</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Placeholder — GET /api/appointments</Text>
    </View>
  )
}
