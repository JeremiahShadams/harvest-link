import { Redirect } from 'expo-router'
import { MarketplaceScreen } from '@/components/harvestlink/marketplace-screen'
import { useHarvestLink } from '@/components/harvestlink/context'

export default function MarketplaceRoute() {
  const { profile, authLoading } = useHarvestLink()

  // A farmer-only account opens straight into the farm cockpit (see docs/design-implementation-plan.md).
  if (authLoading) return null
  if (profile?.role === 'farmer') return <Redirect href="/farmer" />

  return <MarketplaceScreen />
}
