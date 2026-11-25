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
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
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
      screenListeners={{
        tabPress: () => {
          triggerSelectionHaptic()
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.paleGreen,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(14, insets.bottom),
          start: 16,
          end: 16,
          left: 16,
          right: 16,
          height: 68,
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          borderRadius: 28,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderTopWidth: 1,
          borderColor: colors.line,
          borderTopColor: colors.line,
          shadowColor: colors.pineDeep,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 12,
        },
        tabBarItemStyle: {
          borderRadius: 20,
          borderCurve: 'continuous',
          marginHorizontal: 2,
          marginVertical: 2,
          paddingVertical: 3,
          minHeight: 48,
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
