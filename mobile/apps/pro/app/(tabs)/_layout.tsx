import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B5593E',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen name="calendar" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="stats" options={{ title: 'Estadísticas' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  )
}
