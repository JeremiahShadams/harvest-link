import { useHarvestLink } from '@/components/harvestlink/context'
import { OrdersScreen } from '@/components/harvestlink/orders-screen'
import { FarmerTab } from '@/components/harvestlink/design/ui'

export default function OrdersRoute() {
  const { profile } = useHarvestLink()
  const isFarmer = profile?.role === 'farmer' || profile?.role === 'both'

  if (!isFarmer) return <OrdersScreen />

  return (
    <FarmerTab activeTab="orders" showBottomNav={false}>
      <OrdersScreen embedded />
    </FarmerTab>
  )
}
