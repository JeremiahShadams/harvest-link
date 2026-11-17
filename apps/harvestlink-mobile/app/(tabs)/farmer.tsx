import { useHarvestLink } from '@/components/harvestlink/context'
import { FarmerDashboardScreen } from '@/components/harvestlink/design/farmer-dashboard-screen'
import { FarmerScreen } from '@/components/harvestlink/farmer-screen'

export default function FarmerRoute() {
  const { profile } = useHarvestLink()
  const isFarmer = profile?.role === 'farmer' || profile?.role === 'both'
  return isFarmer ? <FarmerDashboardScreen /> : <FarmerScreen />
}
