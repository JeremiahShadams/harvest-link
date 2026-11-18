import { useState, type ReactNode } from 'react'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import {
  Bell,
  ChartNoAxesColumn,
  ChevronDown,
  Home,
  MapPin,
  MessageSquare,
  ShoppingBag,
  User,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHarvestLink } from '../context'
import { useNotifications, useUnreadCount } from '@/lib/harvestlink/use-data'
import { body, C, DESIGN_PROFILE_IMAGE, heading, R, shadow } from './tokens'

export type DesignTab = 'home' | 'orders' | 'chats' | 'signals' | 'profile'

export function DesignScreen({
  children,
  header,
  contentStyle,
  activeTab,
  showBottomNav = true,
}: {
  children: ReactNode
  header?: ReactNode
  contentStyle?: StyleProp<ViewStyle>
  activeTab: DesignTab
  showBottomNav?: boolean
}) {
  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {showBottomNav ? <DesignBottomNavigation active={activeTab} /> : null}
    </View>
  )
}

export function FarmerTab({
  activeTab,
  children,
  contentStyle,
  showBottomNav = true,
}: {
  activeTab: DesignTab
  children: ReactNode
  contentStyle?: StyleProp<ViewStyle>
  showBottomNav?: boolean
}) {
  const { profile } = useHarvestLink()
  const userName = profile?.display_name?.trim().split(/\s+/)[0] || 'there'
  const location = profile?.default_area || 'Add your area in your profile'

  return (
    <DesignScreen
      activeTab={activeTab}
      showBottomNav={showBottomNav}
      header={<DesignHeader userName={userName} location={location} />}
      contentStyle={[showBottomNav ? styles.farmerTabContent : styles.farmerTabContentWithoutNav, contentStyle]}
    >
      {children}
    </DesignScreen>
  )
}

export function DesignHeader({
  userName,
  location,
  profileImage = DESIGN_PROFILE_IMAGE,
}: {
  userName: string
  location: string
  profileImage?: string
}) {
  const insets = useSafeAreaInsets()
  const { user } = useHarvestLink()
  const { data: notifications } = useNotifications(user?.id ?? null)
  const unread = useUnreadCount(notifications)

  return (
    <View style={[styles.header, { paddingTop: 56 + insets.top }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerIdentity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.push('/profile' as never)}
            style={styles.avatarButton}
          >
            <Image source={{ uri: profileImage }} style={styles.avatar} contentFit="cover" />
            <View style={styles.onlineDot} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Hello, {userName} 👋</Text>
            <View style={styles.locationRow}>
              <MapPin color={C.slate500} size={12} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => router.navigate('/chats' as never)}
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
        >
          <Bell color={C.slate600} size={20} />
          {unread > 0 ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>
    </View>
  )
}

export function DesignBottomNavigation({ active }: { active: DesignTab }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(34, insets.bottom) }]}>
      <View style={styles.navRow}>
        <NavItem label="Home" icon={(color) => <Home color={color} size={24} />} active={active === 'home'} onPress={() => router.navigate('/farmer' as never)} />
        <NavItem label="Orders" icon={(color) => <ShoppingBag color={color} size={24} />} active={active === 'orders'} badge onPress={() => router.navigate('/orders' as never)} />
        <NavItem label="Chats" icon={(color) => <MessageSquare color={color} size={24} />} active={active === 'chats'} onPress={() => router.navigate('/chats' as never)} />
        <NavItem label="Signals" icon={(color) => <ChartNoAxesColumn color={color} size={24} />} active={active === 'signals'} onPress={() => router.navigate('/signals' as never)} />
        <NavItem label="Profile" icon={(color) => <User color={color} size={24} />} active={active === 'profile'} onPress={() => router.navigate('/profile' as never)} />
      </View>
    </View>
  )
}

function NavItem({
  label,
  icon,
  active,
  badge = false,
  onPress,
}: {
  label: string
  icon: (color: string) => ReactNode
  active: boolean
  badge?: boolean
  onPress: () => void
}) {
  const color = active ? C.farm800 : C.slate400
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.navItem}
    >
      <View style={styles.navIcon}>{icon(color)}</View>
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
      {badge ? <View style={styles.ordersBadge} /> : null}
    </Pressable>
  )
}

export function DesignSelect<T extends string>({
  value,
  options,
  onChange,
  style,
  textStyle,
  accessibilityLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  accessibilityLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? selected?.label}
        onPress={() => setOpen(true)}
        style={[styles.select, style]}
      >
        <Text style={[styles.selectText, textStyle]}>{selected?.label ?? value}</Text>
        <ChevronDown color={C.slate400} size={16} style={styles.selectChevron} />
      </Pressable>
      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close selector" onPress={() => setOpen(false)} style={styles.modalBackdrop}>
          <Pressable style={styles.selectMenu}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: option.value === value }}
                onPress={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={({ pressed }) => [styles.selectOption, pressed && styles.selectOptionPressed]}
              >
                <Text style={styles.selectOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

export function DesignToggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}
    >
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </Pressable>
  )
}

export function DesignButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconAfter,
  disabled,
  loading,
  style,
  textStyle,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet'
  icon?: ReactNode
  iconAfter?: ReactNode
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'quiet' && styles.buttonQuiet,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? C.white : C.farm800} size="small" /> : icon}
      <Text style={[
        styles.buttonText,
        variant !== 'primary' && variant !== 'danger' && styles.buttonTextDark,
        variant === 'danger' && styles.buttonTextDanger,
        textStyle,
      ]}>{label}</Text>
      {iconAfter}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: C.slate50, flex: 1 },
  content: { flexGrow: 1, width: '100%' },
  farmerTabContent: { paddingBottom: 112, paddingTop: 8 },
  farmerTabContentWithoutNav: { paddingBottom: 24, paddingTop: 8 },
  pressed: { transform: [{ scale: 0.95 }] },
  header: {
    backgroundColor: C.white80,
    borderBottomColor: C.slate100,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 30,
  },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerIdentity: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatarButton: { height: 44, position: 'relative', width: 44 },
  avatar: { borderColor: C.slate100, borderRadius: R.pill, borderWidth: 2, height: 44, width: 44 },
  onlineDot: { backgroundColor: C.green500, borderColor: C.white, borderRadius: R.pill, borderWidth: 2, bottom: 0, height: 12, position: 'absolute', right: 0, width: 12 },
  headerCopy: {},
  greeting: heading({ color: C.slate900, fontSize: 18, fontWeight: '700', lineHeight: 22 }),
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  locationText: body({ color: C.slate500, fontSize: 12 }),
  bellButton: { alignItems: 'center', backgroundColor: C.slate100, borderRadius: R.pill, height: 40, justifyContent: 'center', position: 'relative', width: 40 },
  notificationDot: { backgroundColor: C.red500, borderColor: C.white, borderRadius: R.pill, borderWidth: 1, height: 8, position: 'absolute', right: 10, top: 10, width: 8 },
  bottomNav: { backgroundColor: C.white, borderTopColor: C.slate100, borderTopWidth: 1, bottom: 0, left: 0, paddingHorizontal: 24, paddingTop: 12, position: 'absolute', right: 0, zIndex: 40 },
  navRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  navItem: { alignItems: 'center', gap: 4, minWidth: 48, position: 'relative' },
  navIcon: { height: 26, alignItems: 'center', justifyContent: 'center' },
  navLabel: body({ fontSize: 10, fontWeight: '500' }),
  ordersBadge: { backgroundColor: C.amber500, borderRadius: R.pill, height: 8, position: 'absolute', right: 4, top: 0, width: 8 },
  select: { alignItems: 'center', backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 16, paddingRight: 40, position: 'relative', width: '100%' },
  selectText: body({ color: C.slate700, fontSize: 14 }),
  selectChevron: { position: 'absolute', right: 16 },
  modalBackdrop: { alignItems: 'center', backgroundColor: C.black40, flex: 1, justifyContent: 'center', padding: 24 },
  selectMenu: { backgroundColor: C.white, borderRadius: R['2xl'], overflow: 'hidden', width: '100%' },
  selectOption: { paddingHorizontal: 20, paddingVertical: 16 },
  selectOptionPressed: { backgroundColor: C.slate100 },
  selectOptionText: body({ color: C.slate900, fontSize: 14, fontWeight: '500' }),
  toggleTrack: { borderRadius: R.pill, height: 24, width: 48 },
  toggleTrackOn: { backgroundColor: C.farm600 },
  toggleTrackOff: { backgroundColor: C.slate200 },
  toggleKnob: { backgroundColor: C.white, borderRadius: R.pill, borderColor: C.slate300, borderWidth: 4, height: 24, width: 24 },
  toggleKnobOn: { borderColor: C.farm600, transform: [{ translateX: 24 }] },
  toggleKnobOff: { borderColor: C.slate300, transform: [{ translateX: 0 }] },
  button: { alignItems: 'center', borderRadius: R.xl, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  buttonPrimary: { backgroundColor: C.farm800, ...shadow.action },
  buttonSecondary: { backgroundColor: C.white, borderColor: C.slate200, borderWidth: 1, ...shadow.sm },
  buttonQuiet: { backgroundColor: C.slate100 },
  buttonDanger: { backgroundColor: C.red50 },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonText: body({ color: C.white, fontSize: 14, fontWeight: '700' }),
  buttonTextDark: { color: C.slate700 },
  buttonTextDanger: { color: C.red600 },
})
