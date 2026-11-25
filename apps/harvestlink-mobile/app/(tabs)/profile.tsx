import { useHarvestLink } from '@/components/harvestlink/context'
import { ProfileSettingsScreen } from '@/components/harvestlink/design/profile-settings-screen'
import { ProfileScreen } from '@/components/harvestlink/profile-screen'

export default function ProfileRoute() {
  const { user, activeSpace } = useHarvestLink()
  return user && activeSpace === 'farmer' ? <ProfileSettingsScreen /> : <ProfileScreen />
}
