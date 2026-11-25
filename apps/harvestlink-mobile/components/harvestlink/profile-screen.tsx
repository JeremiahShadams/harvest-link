import { useHarvestLink } from '@/components/harvestlink/context'
import { AppHeader } from '@/components/harvestlink/app-header'
import { PhoneAuthForm } from '@/components/harvestlink/phone-auth-form'
import { ProfileEditor } from '@/components/harvestlink/profile-editor'
import { ScreenScroll } from '@/components/harvestlink/ui'

export function ProfileScreen() {
  const { user, activeSpace } = useHarvestLink()

  if (!user) {
    return (
      <ScreenScroll keyboardAvoiding>
        <AppHeader compact />
        <PhoneAuthForm />
      </ScreenScroll>
    )
  }

  return <ProfileEditor mode={activeSpace} />
}
