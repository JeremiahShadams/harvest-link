import { router } from 'expo-router'
import { Bell, MapPin } from 'lucide-react-native'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useHarvestLink } from './context'
import { useNotifications, useUnreadCount } from '@/lib/harvestlink/use-data'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { colors, fonts } from './ui'

const appMark = require('../../assets/images/harvestlink-icon.png')

export function AppHeader({
  compact = false,
  title,
  subtitle,
}: {
  compact?: boolean
  title?: string
  subtitle?: string
}) {
  const { user, profile, activeSpace, setActiveSpace, avatarUri, t } = useHarvestLink()
  const { data: notifications } = useNotifications(user?.id ?? null)
  const unread = useUnreadCount(notifications)
  const isDualRole = profile?.role === 'both'

  const switchSpace = (next: 'buyer' | 'farmer') => {
    if (next === activeSpace) return
    triggerSelectionHaptic()
    setActiveSpace(next)
    router.replace((next === 'farmer' ? '/farmer' : '/') as never)
  }

  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Image source={appMark} style={styles.mark} contentFit="cover" accessibilityLabel="HarvestLink leaf mark" />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName} numberOfLines={1}>
              {title ?? 'harvestlink'}
            </Text>
            <View style={styles.location}>
              <MapPin size={12} color={colors.leaf} />
              <Text style={styles.locationText} numberOfLines={1}>
                {subtitle ?? (profile?.default_area || 'Lagos, Nigeria')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            onPress={() => router.push('/notifications' as never)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Bell color={colors.ink} size={20} strokeWidth={1.8} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user ? 'Open your profile' : 'Sign in or create your profile'}
            onPress={() => router.push('/profile' as never)}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.display_name?.trim().slice(0, 1).toUpperCase() || (user ? 'H' : '·')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {isDualRole ? (
        <View accessibilityRole="tablist" style={styles.spaceSwitch}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Switch to Buyer Marketplace"
            accessibilityState={{ selected: activeSpace === 'buyer' }}
            onPress={() => switchSpace('buyer')}
            style={[styles.spaceOption, activeSpace === 'buyer' && styles.spaceOptionSelected]}
          >
            <Text style={[styles.spaceText, activeSpace === 'buyer' && styles.spaceTextSelected]}>
              {t('modeBuyer')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Switch to Farmer Dashboard"
            accessibilityState={{ selected: activeSpace === 'farmer' }}
            onPress={() => switchSpace('farmer')}
            style={[styles.spaceOption, activeSpace === 'farmer' && styles.spaceOptionSelected]}
          >
            <Text style={[styles.spaceText, activeSpace === 'farmer' && styles.spaceTextSelected]}>
              {t('modeFarmer')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 10 },
  compactWrap: { paddingHorizontal: 0 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  brand: { alignItems: 'center', flexDirection: 'row', flex: 1, gap: 10, minWidth: 0 },
  mark: { borderRadius: 12, height: 40, width: 40 },
  brandCopy: { flex: 1, gap: 1, minWidth: 0 },
  brandName: { fontFamily: fonts.headingExtra, color: colors.pine, fontSize: 19, letterSpacing: -0.6 },
  location: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  locationText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 12 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', position: 'relative', width: 44 },
  badge: { alignItems: 'center', backgroundColor: colors.gold, borderColor: colors.cream, borderRadius: 99, borderWidth: 1.5, minHeight: 19, justifyContent: 'center', minWidth: 19, paddingHorizontal: 4, position: 'absolute', right: -4, top: -4 },
  badgeText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 12, lineHeight: 14 },
  avatarButton: { alignItems: 'center', backgroundColor: colors.pine, borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', overflow: 'hidden', width: 44 },
  avatarImage: { height: 44, width: 44 },
  avatarText: { fontFamily: fonts.heading, color: colors.white, fontSize: 16 },
  spaceSwitch: { backgroundColor: '#EAE6DA', borderRadius: 12, flexDirection: 'row', padding: 3 },
  spaceOption: { alignItems: 'center', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 44 },
  spaceOptionSelected: { backgroundColor: colors.white },
  spaceText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  spaceTextSelected: { fontFamily: fonts.bodyBold, color: colors.pine },
  pressed: { opacity: 0.78 },
})
