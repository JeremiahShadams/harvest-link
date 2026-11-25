import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import type { Tabs } from 'expo-router'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { colors, fonts } from './ui'

export type FloatingTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

const CAPSULE_HEIGHT = 60
const INNER_PADDING = 4
const ACTIVE_PILL_HEIGHT = CAPSULE_HEIGHT - INNER_PADDING * 2 - 2

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets: propInsets }: FloatingTabBarProps) {
  const safeInsets = useSafeAreaInsets()
  const insets = propInsets ?? safeInsets
  const [trackWidth, setTrackWidth] = useState(0)
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => !descriptors[route.key]?.options?.hidden),
    [descriptors, state.routes],
  )

  const activeRouteKey = state.routes[state.index]?.key
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === activeRouteKey),
  )

  const tabCount = Math.max(1, visibleRoutes.length)
  const slotWidth = trackWidth > 0 ? trackWidth / tabCount : 0

  const indicatorX = useSharedValue(0)
  const barVisibility = useSharedValue(1)

  useEffect(() => {
    if (slotWidth <= 0) return
    indicatorX.value = withSpring(activeVisibleIndex * slotWidth, {
      damping: 22,
      stiffness: 260,
      mass: 0.85,
    })
  }, [activeVisibleIndex, indicatorX, slotWidth])

  useEffect(() => {
    barVisibility.value = withTiming(keyboardVisible ? 0 : 1, { duration: 180 })
  }, [barVisibility, keyboardVisible])

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }))

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: barVisibility.value,
    transform: [{ translateY: (1 - barVisibility.value) * 90 }],
  }))

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width
    if (width > 0 && Math.abs(width - trackWidth) > 0.5) {
      setTrackWidth(width)
    }
  }

  if (visibleRoutes.length === 0) return null

  return (
    <Animated.View
      pointerEvents={keyboardVisible ? 'none' : 'box-none'}
      style={[
        styles.outerAnchor,
        { bottom: Math.max(14, insets.bottom) },
        containerAnimatedStyle,
      ]}
    >
      <View style={styles.capsule}>
        <View onLayout={handleTrackLayout} role="tablist" style={styles.track}>
          {slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                { width: slotWidth },
                indicatorStyle,
              ]}
            />
          ) : null}

          {visibleRoutes.map((route, index) => {
            const descriptor = descriptors[route.key]
            const options = descriptor?.options ?? {}
            const focused = route.key === activeRouteKey
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name

            const tint = focused ? colors.pine : '#3D4740'
            const badgeValue = options.tabBarBadge

            const onPress = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              triggerSelectionHaptic()
              if (!focused && !event.defaultPrevented) {
                navigateToTab(route.key)
              }
            }

            const onLongPress = () => {
              emitter.emit({
                type: 'tabLongPress',
                target: route.key,
              })
            }

            return (
              <Pressable
                key={route.key}
                accessibilityLabel={
                  options.tabBarAccessibilityLabel ??
                  `${label}, tab ${index + 1} of ${visibleRoutes.length}`
                }
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                onLongPress={onLongPress}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabButton,
                  focused && slotWidth <= 0 && styles.fallbackActivePill,
                  pressed && styles.tabPressed,
                ]}
              >
                <View style={styles.iconWrap}>
                  {options.tabBarIcon
                    ? options.tabBarIcon({ focused, color: tint, size: 20 })
                    : null}
                  {badgeValue !== undefined && badgeValue !== null ? (
                    <View style={styles.badge}>
                      <Text numberOfLines={1} style={styles.badgeText}>
                        {badgeValue}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={[styles.label, focused && styles.labelFocused]}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  outerAnchor: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: 18,
    position: 'absolute',
    right: 0,
  },
  capsule: {
    backgroundColor: 'rgba(255, 254, 250, 0.96)',
    borderColor: 'rgba(33, 74, 56, 0.10)',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 12,
    height: CAPSULE_HEIGHT,
    maxWidth: 420,
    padding: INNER_PADDING,
    shadowColor: '#143015',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    width: '100%',
  },
  track: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  activePill: {
    backgroundColor: colors.paleGreen,
    borderCurve: 'continuous',
    borderRadius: 999,
    height: ACTIVE_PILL_HEIGHT,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  fallbackActivePill: {
    backgroundColor: colors.paleGreen,
    borderRadius: 999,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    height: ACTIVE_PILL_HEIGHT,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
    zIndex: 1,
  },
  tabPressed: {
    opacity: 0.78,
  },
  iconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -4,
  },
  badgeText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 14,
  },
  label: {
    color: '#3D4740',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  labelFocused: {
    color: colors.pine,
    fontFamily: fonts.bodyBold,
  },
})
