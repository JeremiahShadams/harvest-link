import { router } from 'expo-router'
import { Bell, MapPin } from 'lucide-react-native'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useHarvestLink } from './context'
import { useNotifications, useUnreadCount } from '@/lib/harvestlink/use-data'
import { colors } from './ui'

const appMark = require('../../assets/images/harvestlink-icon.png')

export function AppHeader({ compact = false }: { compact?: boolean }) {
  const { user, profile } = useHarvestLink()
  const { data: notifications } = useNotifications(user?.id ?? null)
  const unread = useUnreadCount(notifications)

  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <View style={styles.brand}>
        <Image source={appMark} style={styles.mark} contentFit="cover" accessibilityLabel="HarvestLink leaf mark" />
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>harvestlink</Text>
          <View style={styles.location}><MapPin size={11} color={colors.leaf} /><Text style={styles.locationText}>{profile?.default_area || 'Lagos, Nigeria'}</Text></View>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => router.push('/notifications' as never)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Bell color={colors.ink} size={19} strokeWidth={1.8} />
          {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={user ? 'Open your profile' : 'Sign in or create your profile'}
          onPress={() => router.push('/profile' as never)}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{profile?.display_name?.trim().slice(0, 1).toUpperCase() || (user ? 'H' : '·')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  compactRow: { paddingHorizontal: 0 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  mark: { borderRadius: 12, height: 38, width: 38 },
  brandCopy: { gap: 1 },
  brandName: { color: colors.pine, fontSize: 18, fontWeight: '800', letterSpacing: -0.8 },
  location: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  locationText: { color: colors.muted, fontSize: 10, fontWeight: '500' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  iconButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', position: 'relative', width: 42 },
  badge: { alignItems: 'center', backgroundColor: colors.gold, borderColor: colors.cream, borderRadius: 99, borderWidth: 1.5, height: 17, justifyContent: 'center', minWidth: 17, paddingHorizontal: 3, position: 'absolute', right: -4, top: -4 },
  badgeText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  avatar: { alignItems: 'center', backgroundColor: colors.pine, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
})
