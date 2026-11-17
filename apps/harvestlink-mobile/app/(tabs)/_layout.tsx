import { Tabs } from 'expo-router'
import { Bell, ClipboardList, ScanLine, Store, Tractor } from 'lucide-react-native'
import { colors } from '@/components/harvestlink/ui'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 78,
          paddingBottom: 18,
          paddingTop: 9,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Market', tabBarIcon: ({ color, size }) => <Store color={color} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }} />
      <Tabs.Screen name="scan" options={{ title: 'Freshness', tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} /> }} />
      <Tabs.Screen name="farmer" options={{ title: 'My farm', tabBarIcon: ({ color, size }) => <Tractor color={color} size={size} /> }} />
    </Tabs>
  )
}
