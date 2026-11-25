import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react-native'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'

export const colors = {
  pine: '#214A38',
  pineDeep: '#143015',
  leaf: '#4E6B3A',
  gold: '#D49B3D',
  goldDeep: '#865D1D',
  cream: '#F5F2E9',
  creamSubtle: '#FAF8F2',
  ink: '#23332A',
  muted: '#59645C',
  line: '#E5E0D4',
  white: '#FFFFFF',
  paleGreen: '#E8EFE4',
  paleGold: '#F5EBD5',
  red: '#A94437',
  paleRed: '#F9E8E3',
} as const

export const fonts = {
  headingRegular: 'CabinetGrotesk-Regular',
  headingMedium: 'CabinetGrotesk-Medium',
  heading: 'CabinetGrotesk-Bold',
  headingExtra: 'CabinetGrotesk-ExtraBold',
  body: 'Satoshi-Regular',
  bodyMedium: 'Satoshi-Medium',
  bodyBold: 'Satoshi-Bold',
} as const

export const radii = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const

export const space = { xxs: 4, xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 } as const

/**
 * Accessible type scale: 12px minimum floor across the entire application.
 */
export const typeScale: Record<'hero' | 'display' | 'title' | 'heading' | 'body' | 'small' | 'micro', TextStyle> = {
  hero: { fontFamily: fonts.headingExtra, fontSize: 34, lineHeight: 40, letterSpacing: -1.0 },
  display: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  title: { fontFamily: fonts.heading, fontSize: 21, lineHeight: 27, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  micro: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <Text style={[styles.eyebrow, light && styles.eyebrowLight]}>{children}</Text>
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleCopy}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function AnimatedEntrance({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode
  delay?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(delay).easing(Easing.out(Easing.quad))} style={style}>
      {children}
    </Animated.View>
  )
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconAfter,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  icon?: ReactNode
  iconAfter?: ReactNode
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'quiet' && styles.buttonQuiet,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.pine} size="small" /> : icon}
      <Text
        style={[
          styles.buttonLabel,
          variant !== 'primary' && variant !== 'danger' && styles.buttonLabelDark,
          variant === 'danger' && styles.buttonLabelDanger,
        ]}
      >
        {label}
      </Text>
      {iconAfter}
    </Pressable>
  )
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  secureTextEntry,
  multiline,
  autoCapitalize,
  autoComplete,
  style,
  editable = true,
  accessibilityLabel,
  hint,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  maxLength?: number
  secureTextEntry?: boolean
  multiline?: boolean
  autoCapitalize?: TextInputProps['autoCapitalize']
  autoComplete?: TextInputProps['autoComplete']
  style?: StyleProp<ViewStyle>
  editable?: boolean
  accessibilityLabel?: string
  hint?: string
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoComplete={autoComplete}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7A847D"
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputReadonly]}
        value={value}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  style,
  accessibilityLabel,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? selected?.label ?? value}
        onPress={() => {
          triggerSelectionHaptic()
          setOpen(true)
        }}
        style={({ pressed }) => [styles.selectTrigger, pressed && styles.buttonPressed, style]}
      >
        <Text style={styles.selectValue} numberOfLines={1}>{selected?.label ?? value}</Text>
        <ChevronDown color={colors.muted} size={18} />
      </Pressable>
      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close selector" onPress={() => setOpen(false)} style={styles.modalBackdrop}>
          <Pressable style={styles.selectMenu}>
            {label ? <Text style={styles.selectMenuTitle}>{label}</Text> : null}
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    triggerSelectionHaptic()
                    onChange(option.value)
                    setOpen(false)
                  }}
                  style={({ pressed }) => [
                    styles.selectOption,
                    isSelected && styles.selectOptionSelected,
                    pressed && styles.selectOptionPressed,
                  ]}
                >
                  <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextSelected]}>{option.label}</Text>
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

export function ToggleSwitch({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  const progress = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 220 })
  }, [progress, value])

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 22 }],
  }))

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        triggerSelectionHaptic()
        onChange(!value)
      }}
      style={styles.toggleHitArea}
    >
      <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}>
        <Animated.View style={[styles.toggleKnob, thumbStyle]} />
      </View>
    </Pressable>
  )
}

export function MessageBanner({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : 'text'} style={[styles.banner, tone === 'error' ? styles.bannerError : styles.bannerInfo]}>
      <Text style={styles.bannerText}>{children}</Text>
    </View>
  )
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>HL</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action}
    </View>
  )
}

export function StatusBadge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'gold' | 'gray' | 'red' }) {
  return (
    <View
      style={[
        styles.statusBadge,
        tone === 'gold' && styles.statusGold,
        tone === 'gray' && styles.statusGray,
        tone === 'red' && styles.statusRed,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          tone === 'gold' && styles.statusTextGold,
          tone === 'gray' && styles.statusTextGray,
          tone === 'red' && styles.statusTextRed,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

export function ScreenScroll({
  children,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  keyboardAvoiding = false,
}: {
  children: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  refreshing?: boolean
  onRefresh?: () => void
  keyboardAvoiding?: boolean
}) {
  const insets = useSafeAreaInsets()
  const scroll = (
    <ScrollView
      contentContainerStyle={[
        styles.screenContent,
        { paddingBottom: 104 + Math.max(14, insets.bottom) },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.pine}
            colors={[colors.pine]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  )

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {scroll}
        </KeyboardAvoidingView>
      ) : (
        scroll
      )}
    </SafeAreaView>
  )
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || 'H'
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.avatar, { borderRadius: Math.round(size / 3), height: size, width: size }]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.max(14, Math.round(size * 0.4)) }]}>{initial}</Text>
    </View>
  )
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'green',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'green' | 'gold'
}) {
  return (
    <View style={[styles.statTile, tone === 'gold' && styles.statTileGold]}>
      <Text style={styles.statTileValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
      {hint ? <Text style={styles.statTileHint}>{hint}</Text> : null}
    </View>
  )
}

export function ProgressBar({ value, tone = 'leaf' }: { value: number; tone?: 'leaf' | 'gold' | 'red' }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const widthPct = useSharedValue(0)

  useEffect(() => {
    widthPct.value = withTiming(clamped, { duration: 480, easing: Easing.out(Easing.cubic) })
  }, [clamped, widthPct])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }))

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={styles.progressTrack}
    >
      <Animated.View
        style={[
          styles.progressFill,
          tone === 'gold' && styles.progressFillGold,
          tone === 'red' && styles.progressFillRed,
          fillStyle,
        ]}
      />
    </View>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View accessibilityRole="tablist" style={[styles.segment, style]}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              triggerSelectionHaptic()
              onChange(option.value)
            }}
            style={[styles.segmentOption, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function SkeletonBox({ height = 16, width = '100%', radius = radii.md, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.45)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700 }),
        withTiming(0.45, { duration: 700 }),
      ),
      -1,
      true,
    )
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return <Animated.View style={[{ backgroundColor: '#E4DFD3', borderRadius: radius, height, width }, animatedStyle, style]} />
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonBox height={132} width={112} radius={14} />
      <View style={styles.skeletonCopy}>
        <SkeletonBox height={14} width="45%" />
        <SkeletonBox height={20} width="80%" />
        <SkeletonBox height={14} width="65%" />
        <SkeletonBox height={18} width="40%" />
      </View>
    </View>
  )
}

export function OrderCardSkeleton() {
  return (
    <View style={styles.skeletonOrder}>
      <View style={styles.skeletonRow}>
        <SkeletonBox height={18} width="52%" />
        <SkeletonBox height={24} width="26%" radius={999} />
      </View>
      <SkeletonBox height={14} width="70%" />
      <SkeletonBox height={14} width="55%" />
      <SkeletonBox height={10} width="100%" />
    </View>
  )
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />
}

export function KeyValueRow({ label, value, emphasis = false }: { label: string; value: ReactNode; emphasis?: boolean }) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={[styles.keyValueValue, emphasis && styles.keyValueEmphasis]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  eyebrow: { fontFamily: fonts.bodyBold, color: colors.leaf, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' },
  eyebrowLight: { color: '#E4EBDD' },
  sectionTitleRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  sectionTitleCopy: { flex: 1, gap: 4 },
  sectionTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 21, letterSpacing: -0.4 },
  card: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, padding: 16 },
  button: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 15, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  buttonPrimary: { backgroundColor: colors.pine },
  buttonSecondary: { backgroundColor: colors.paleGreen, borderColor: '#D6E1D1', borderWidth: 1 },
  buttonQuiet: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1 },
  buttonDanger: { backgroundColor: colors.paleRed, borderColor: '#F0D1CA', borderWidth: 1 },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonLabel: { fontFamily: fonts.bodyBold, color: colors.white, fontSize: 14 },
  buttonLabelDark: { color: colors.pine },
  buttonLabelDanger: { color: colors.red },
  field: { gap: 7, width: '100%' },
  fieldLabel: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
  fieldHint: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 16 },
  input: { fontFamily: fonts.body, backgroundColor: colors.white, borderColor: colors.line, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, width: '100%' },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: colors.creamSubtle, color: colors.muted },
  selectTrigger: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 13, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 14, width: '100%' },
  selectValue: { fontFamily: fonts.bodyMedium, color: colors.ink, flex: 1, fontSize: 14, marginRight: 8 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(24,38,29,0.48)', flex: 1, justifyContent: 'center', padding: 24 },
  selectMenu: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, overflow: 'hidden', width: '100%', maxWidth: 420 },
  selectMenuTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 16, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  selectOption: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
  selectOptionSelected: { backgroundColor: colors.paleGreen },
  selectOptionPressed: { backgroundColor: colors.creamSubtle },
  selectOptionText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 14 },
  selectOptionTextSelected: { fontFamily: fonts.bodyBold, color: colors.pine },
  toggleHitArea: { minHeight: 44, minWidth: 52, justifyContent: 'center', alignItems: 'flex-end' },
  toggleTrack: { borderRadius: 999, height: 28, justifyContent: 'center', padding: 3, width: 50 },
  toggleTrackOn: { backgroundColor: colors.pine },
  toggleTrackOff: { backgroundColor: '#D6D2C7' },
  toggleKnob: { backgroundColor: colors.white, borderRadius: 999, height: 22, width: 22 },
  banner: { borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12 },
  bannerError: { backgroundColor: colors.paleRed, borderColor: '#F0D1CA', borderWidth: 1 },
  bannerInfo: { backgroundColor: colors.paleGreen, borderColor: '#D6E1D1', borderWidth: 1 },
  bannerText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13, lineHeight: 19 },
  emptyState: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, gap: 10, paddingHorizontal: 22, paddingVertical: 28 },
  emptyMark: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 20, height: 50, justifyContent: 'center', width: 50 },
  emptyMarkText: { fontFamily: fonts.headingExtra, color: colors.pine, fontSize: 14, letterSpacing: 1 },
  emptyTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 18, textAlign: 'center' },
  emptyMessage: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 20, maxWidth: 320, textAlign: 'center' },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: colors.paleGreen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusGold: { backgroundColor: colors.paleGold },
  statusGray: { backgroundColor: '#EFECE3' },
  statusRed: { backgroundColor: colors.paleRed },
  statusText: { fontFamily: fonts.bodyBold, color: colors.pine, fontSize: 12 },
  statusTextGold: { color: colors.goldDeep },
  statusTextGray: { color: colors.muted },
  statusTextRed: { color: colors.red },
  screen: { backgroundColor: colors.cream, flex: 1 },
  screenContent: { alignSelf: 'center', maxWidth: 520, paddingBottom: 32, width: '100%' },
  avatar: { alignItems: 'center', backgroundColor: colors.pine, justifyContent: 'center' },
  avatarText: { fontFamily: fonts.heading, color: colors.white },
  statTile: { backgroundColor: colors.paleGreen, borderRadius: radii.md, flex: 1, gap: 3, paddingHorizontal: 12, paddingVertical: 12 },
  statTileGold: { backgroundColor: colors.paleGold },
  statTileValue: { fontFamily: fonts.headingExtra, color: colors.ink, fontSize: 20, letterSpacing: -0.4 },
  statTileLabel: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 12 },
  statTileHint: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  progressTrack: { backgroundColor: '#E6E9E1', borderRadius: radii.pill, height: 8, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: colors.leaf, borderRadius: radii.pill, height: '100%' },
  progressFillGold: { backgroundColor: colors.gold },
  progressFillRed: { backgroundColor: colors.red },
  segment: { backgroundColor: '#EAE6DA', borderRadius: radii.md, flexDirection: 'row', padding: 4 },
  segmentOption: { alignItems: 'center', borderRadius: radii.sm, flex: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  segmentSelected: { backgroundColor: colors.white },
  segmentText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  segmentTextSelected: { fontFamily: fonts.bodyBold, color: colors.pine },
  skeletonCard: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 10 },
  skeletonCopy: { flex: 1, gap: 10, justifyContent: 'center' },
  skeletonOrder: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, gap: 12, padding: 16 },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { backgroundColor: colors.line, height: 1, width: '100%' },
  keyValueRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  keyValueLabel: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  keyValueValue: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
  keyValueEmphasis: { fontFamily: fonts.headingExtra, fontSize: 16 },
})
