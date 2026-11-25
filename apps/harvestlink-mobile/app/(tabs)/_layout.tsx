import { useMemo } from 'react'
import { Tabs } from 'expo-router'
import {
  ChartNoAxesColumn,
  PackageCheck,
  ScanLine,
  ShoppingBag,
  Sprout,
  Store,
  User,
} from 'lucide-react-native'
import { useHarvestLink } from '@/components/harvestlink/context'
import { FloatingTabBar } from '@/components/harvestlink/floating-tab-bar'
import { useOrders } from '@/lib/harvestlink/use-data'

export default function TabLayout() {
  const { user, activeSpace, t } = useHarvestLink()
  const { data: orders } = useOrders(user?.id ?? null)

  const isFarmerSpace = activeSpace === 'farmer'
  const isBuyerSpace = activeSpace === 'buyer'

  const pendingFarmerCount = useMemo(
    () => (orders ?? []).filter((order) => order.farmer_id === user?.id && order.status === 'pending').length,
    [orders, user?.id],
  )

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabMarket'),
          href: isBuyerSpace ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => <Store color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="farmer"
        options={{
          title: t('tabHome'),
          href: isFarmerSpace ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => <Sprout color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="harvests"
        options={{
          title: t('tabHarvests'),
          href: isFarmerSpace ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => <PackageCheck color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabOrders'),
          tabBarBadge: isFarmerSpace && pendingFarmerCount > 0 ? pendingFarmerCount : undefined,
          tabBarIcon: ({ color, size, focused }) => <ShoppingBag color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: t('tabSignals'),
          href: isFarmerSpace ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => <ChartNoAxesColumn color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabScan'),
          href: isBuyerSpace ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => <ScanLine color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size, focused }) => <User color={color} size={size} strokeWidth={focused ? 2.2 : 1.75} />,
        }}
      />
    </Tabs>
  )
}
