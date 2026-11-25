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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHarvestLink } from '@/components/harvestlink/context'
import { colors, fonts } from '@/components/harvestlink/ui'
import { useOrders } from '@/lib/harvestlink/use-data'

export default function TabLayout() {
  const { user, activeSpace, t } = useHarvestLink()
  const { data: orders } = useOrders(user?.id ?? null)
  const insets = useSafeAreaInsets()

  const isFarmerSpace = activeSpace === 'farmer'
  const isBuyerSpace = activeSpace === 'buyer'

  const pendingFarmerCount = useMemo(
    () => (orders ?? []).filter((order) => order.farmer_id === user?.id && order.status === 'pending').length,
    [orders, user?.id],
  )

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
          height: 62 + Math.max(12, insets.bottom),
          paddingBottom: Math.max(12, insets.bottom),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyBold,
          fontSize: 12,
          marginTop: 2,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.gold,
          color: colors.ink,
          fontFamily: fonts.bodyBold,
          fontSize: 12,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabMarket'),
          href: isBuyerSpace ? undefined : null,
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="farmer"
        options={{
          title: t('tabHome'),
          href: isFarmerSpace ? undefined : null,
          tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="harvests"
        options={{
          title: t('tabHarvests'),
          href: isFarmerSpace ? undefined : null,
          tabBarIcon: ({ color, size }) => <PackageCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabOrders'),
          tabBarBadge: isFarmerSpace && pendingFarmerCount > 0 ? pendingFarmerCount : undefined,
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: t('tabSignals'),
          href: isFarmerSpace ? undefined : null,
          tabBarIcon: ({ color, size }) => <ChartNoAxesColumn color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabScan'),
          href: isBuyerSpace ? undefined : null,
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
