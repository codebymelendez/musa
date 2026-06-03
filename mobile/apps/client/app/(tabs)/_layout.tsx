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
      <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Mis citas' }} />
      <Tabs.Screen name="loyalty" options={{ title: 'Mis puntos' }} />
    </Tabs>
  )
}
