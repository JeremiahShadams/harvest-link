import { useHarvestLink } from '@/components/harvestlink/context'
import { PhoneAuthForm } from '@/components/harvestlink/phone-auth-form'
import { ProfileEditor } from '@/components/harvestlink/profile-editor'
import { AppHeader } from '@/components/harvestlink/app-header'
import { ScreenScroll } from '@/components/harvestlink/ui'

export function ProfileSettingsScreen() {
  const { user } = useHarvestLink()

  if (!user) {
    return (
      <ScreenScroll keyboardAvoiding>
        <AppHeader compact />
        <PhoneAuthForm />
      </ScreenScroll>
    )
  }

  return <ProfileEditor mode="farmer" />
}
