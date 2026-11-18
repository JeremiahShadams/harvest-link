import { useHarvestLink } from '@/components/harvestlink/context'
import { ProfileSettingsScreen } from '@/components/harvestlink/design/profile-settings-screen'
import { ProfileScreen } from '@/components/harvestlink/profile-screen'

export default function ProfileRoute() {
  const { profile } = useHarvestLink()
  const isFarmer = profile?.role === 'farmer' || profile?.role === 'both'
  return isFarmer ? <ProfileSettingsScreen showBottomNav={false} /> : <ProfileScreen />
}
