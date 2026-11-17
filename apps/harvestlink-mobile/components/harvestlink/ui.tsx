import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const colors = {
  pine: '#214A38',
  leaf: '#637F4A',
  gold: '#D49B3D',
  cream: '#F5F2E9',
  ink: '#23332A',
  muted: '#6D776F',
  line: '#E5E0D4',
  white: '#FFFFFF',
  paleGreen: '#E8EFE4',
  paleGold: '#F5EBD5',
  red: '#A94437',
  paleRed: '#F9E8E3',
}

export const radii = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const

export const space = { xxs: 4, xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 } as const

export const typeScale: Record<'display' | 'title' | 'heading' | 'body' | 'small' | 'micro', TextStyle> = {
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.9 },
  title: { fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 12, lineHeight: 17 },
  micro: { fontSize: 10, lineHeight: 14 },
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

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  icon?: ReactNode
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
      <Text style={[styles.buttonLabel, variant !== 'primary' && styles.buttonLabelDark]}>{label}</Text>
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
  editable,
  accessibilityLabel,
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
        placeholderTextColor="#899188"
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
      />
    </View>
  )
}

export function MessageBanner({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  return <View accessibilityRole={tone === 'error' ? 'alert' : 'text'} style={[styles.banner, tone === 'error' ? styles.bannerError : styles.bannerInfo]}><Text style={styles.bannerText}>{children}</Text></View>
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

export function StatusBadge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'gold' | 'gray' }) {
  return <View style={[styles.statusBadge, tone === 'gold' && styles.statusGold, tone === 'gray' && styles.statusGray]}><Text style={[styles.statusText, tone === 'gold' && styles.statusTextGold, tone === 'gray' && styles.statusTextGray]}>{label}</Text></View>
}

export function ScreenScroll({ children, contentContainerStyle }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.screenContent, contentContainerStyle]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
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
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.4) }]}>{initial}</Text>
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
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={styles.progressTrack}
    >
      <View
        style={[
          styles.progressFill,
          tone === 'gold' && styles.progressFillGold,
          tone === 'red' && styles.progressFillRed,
          { width: `${clamped}%` },
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
            onPress={() => onChange(option.value)}
            style={[styles.segmentOption, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        )
      })}
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
  eyebrow: { color: colors.leaf, fontSize: 10, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  eyebrowLight: { color: '#E4EBDD' },
  sectionTitleRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  sectionTitleCopy: { flex: 1, gap: 5 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  card: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, padding: 16 },
  button: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 15, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  buttonPrimary: { backgroundColor: colors.pine },
  buttonSecondary: { backgroundColor: colors.paleGreen, borderColor: '#D6E1D1', borderWidth: 1 },
  buttonQuiet: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1 },
  buttonDanger: { backgroundColor: colors.paleRed, borderColor: '#F0D1CA', borderWidth: 1 },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  buttonLabelDark: { color: colors.pine },
  field: { gap: 7, width: '100%' },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, width: '100%' },
  inputMultiline: { minHeight: 86, textAlignVertical: 'top' },
  banner: { borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11 },
  bannerError: { backgroundColor: colors.paleRed },
  bannerInfo: { backgroundColor: colors.paleGreen },
  bannerText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  emptyState: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, gap: 10, paddingHorizontal: 22, paddingVertical: 28 },
  emptyMark: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 20, height: 50, justifyContent: 'center', width: 50 },
  emptyMarkText: { color: colors.pine, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, maxWidth: 310, textAlign: 'center' },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: colors.paleGreen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusGold: { backgroundColor: colors.paleGold },
  statusGray: { backgroundColor: '#F0F0EB' },
  statusText: { color: colors.pine, fontSize: 11, fontWeight: '700' },
  statusTextGold: { color: '#865D1D' },
  statusTextGray: { color: colors.muted },
  screen: { backgroundColor: colors.cream, flex: 1 },
  screenContent: { alignSelf: 'center', maxWidth: 520, paddingBottom: 32, width: '100%' },
  avatar: { alignItems: 'center', backgroundColor: colors.pine, justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '700' },
  statTile: { backgroundColor: colors.paleGreen, borderRadius: radii.md, flex: 1, gap: 2, paddingHorizontal: 12, paddingVertical: 12 },
  statTileGold: { backgroundColor: colors.paleGold },
  statTileValue: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  statTileLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  statTileHint: { color: colors.muted, fontSize: 9 },
  progressTrack: { backgroundColor: '#E6E9E1', borderRadius: radii.pill, height: 7, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: colors.leaf, borderRadius: radii.pill, height: '100%' },
  progressFillGold: { backgroundColor: colors.gold },
  progressFillRed: { backgroundColor: colors.red },
  segment: { backgroundColor: '#EBE9E1', borderRadius: radii.md, flexDirection: 'row', padding: 3 },
  segmentOption: { alignItems: 'center', borderRadius: radii.sm, flex: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: 8 },
  segmentSelected: { backgroundColor: colors.white },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  segmentTextSelected: { color: colors.pine, fontWeight: '700' },
  divider: { backgroundColor: colors.line, height: 1, width: '100%' },
  keyValueRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  keyValueLabel: { color: colors.muted, fontSize: 12 },
  keyValueValue: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  keyValueEmphasis: { fontSize: 15, fontWeight: '800' },
})
