import { useHarvestLink } from '@/components/harvestlink/context'
import { MarketplaceSignalsScreen } from '@/components/harvestlink/design/marketplace-signals-screen'
import { SignalsScreen } from '@/components/harvestlink/signals-screen'

export default function SignalsRoute() {
  const { profile } = useHarvestLink()
  const isFarmer = profile?.role === 'farmer' || profile?.role === 'both'
  return isFarmer ? <MarketplaceSignalsScreen /> : <SignalsScreen />
}
