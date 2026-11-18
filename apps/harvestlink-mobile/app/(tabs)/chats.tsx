import { NotificationsScreen } from '@/components/harvestlink/notifications-screen'
import { FarmerTab } from '@/components/harvestlink/design/ui'

export default function ChatsRoute() {
  return (
    <FarmerTab activeTab="chats" showBottomNav={false}>
      <NotificationsScreen embedded />
    </FarmerTab>
  )
}
