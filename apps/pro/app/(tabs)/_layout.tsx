import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IoniconName }[] = [
  { name: 'index',    title: 'Inicio',   icon: 'home-outline'      },
  { name: 'calendar', title: 'Agenda',   icon: 'calendar-outline'  },
  { name: 'clients',  title: 'Clientas', icon: 'people-outline'    },
  { name: 'business', title: 'Negocio',  icon: 'briefcase-outline' },
  { name: 'settings', title: 'Ajustes',  icon: 'settings-outline'  },
]

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B5593E',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EDE8E4',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 2,
        },
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} size={size} color={color} />
            ),
          }}
        />
      ))}
      {/* Accessible via router.push but not visible in tab bar */}
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  )
}
