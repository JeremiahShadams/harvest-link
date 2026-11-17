import { Tabs } from 'expo-router'
import { ChartNoAxesCombined, CircleUserRound, ClipboardList, ScanLine, Sprout, Store } from 'lucide-react-native'
import { useHarvestLink } from '@/components/harvestlink/context'
import { colors } from '@/components/harvestlink/ui'

export default function TabLayout() {
  const { profile } = useHarvestLink()
  const role = profile?.role ?? 'buyer'
  const isFarmer = role === 'farmer' || role === 'both'
  const isBuyer = role === 'buyer' || role === 'both'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: isFarmer
          ? { display: 'none' }
          : {
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Market',
          href: isBuyer ? undefined : null,
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="farmer"
        options={{
          title: 'Home',
          href: isFarmer ? undefined : null,
          tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: 'Signals',
          href: isFarmer ? undefined : null,
          tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Freshness',
          href: isBuyer ? undefined : null,
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <CircleUserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
