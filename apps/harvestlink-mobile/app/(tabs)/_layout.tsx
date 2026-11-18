import { Tabs } from 'expo-router/js-tabs'
import {
  ChartNoAxesColumn,
  MessageSquare,
  ScanLine,
  ShoppingBag,
  Sprout,
  Store,
  User,
} from 'lucide-react-native'
import { useHarvestLink } from '@/components/harvestlink/context'
import { C, FONT_BODY } from '@/components/harvestlink/design/tokens'

export default function TabLayout() {
  const { profile } = useHarvestLink()
  const role = profile?.role ?? 'buyer'
  const isFarmer = role === 'farmer' || role === 'both'
  const isBuyer = role === 'buyer'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.farm800,
        tabBarInactiveTintColor: C.slate400,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.slate100,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontFamily: FONT_BODY, fontSize: 10, fontWeight: '600', marginTop: 2 },
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
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          href: isFarmer ? undefined : null,
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: 'Signals',
          href: isFarmer ? undefined : null,
          tabBarIcon: ({ color, size }) => <ChartNoAxesColumn color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Freshness Scan',
          href: isBuyer ? undefined : null,
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
