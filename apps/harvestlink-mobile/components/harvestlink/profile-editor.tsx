import { useCallback, useEffect, useMemo, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Camera, LogOut, ShieldCheck, Sprout, Trash2 } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import appConfig from '@/app.json'
import { AppHeader } from '@/components/harvestlink/app-header'
import { useHarvestLink } from '@/components/harvestlink/context'
import {
  AnimatedEntrance,
  AppButton,
  Avatar,
  Card,
  Eyebrow,
  KeyValueRow,
  MessageBanner,
  ScreenScroll,
  SegmentedControl,
  SelectField,
  SkeletonBox,
  TextField,
  ToggleSwitch,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { loadDesignValue, saveDesignValue } from '@/lib/harvestlink/design-local'
import { triggerImpactHaptic, triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { LANGUAGE_OPTIONS, type AppLanguage } from '@/lib/harvestlink/i18n'
import type { AppSpace, HarvestRole } from '@/lib/harvestlink/types'
import { useSignOut, useUpdateProfile } from '@/lib/harvestlink/use-data'
import { BUYER_AREAS, FARM_HUBS } from '@/lib/harvestlink/utils'

const ROLE_OPTIONS: { value: HarvestRole; label: string; caption: string }[] = [
  { value: 'buyer', label: 'Buyer', caption: 'Shop direct from farms' },
  { value: 'farmer', label: 'Farmer', caption: 'Publish & fulfill harvests' },
  { value: 'both', label: 'Both', caption: 'Buy and sell in one account' },
]

const SPACE_OPTIONS: { value: AppSpace; label: string }[] = [
  { value: 'buyer', label: 'Buyer Market' },
  { value: 'farmer', label: 'Farmer Hub' },
]

export function ProfileEditor({ mode }: { mode: AppSpace }) {
  const {
    user,
    profile,
    authLoading,
    profileError,
    refreshProfile,
    activeSpace,
    setActiveSpace,
    avatarUri,
    setAvatarUri,
    language,
    setLanguage,
    t,
  } = useHarvestLink()

  const { updateProfile, busy: saving, error: saveError, setError: setSaveError } = useUpdateProfile()
  const { signOut, busy: signingOut, error: signOutError } = useSignOut()

  const defaultFallbackArea = mode === 'farmer' ? 'Ikorodu' : 'Lekki'
  const profileSignature = profile
    ? `${profile.id}:${profile.display_name}:${profile.farm_name ?? ''}:${profile.role}:${profile.default_area}`
    : 'none'
  const [syncedSignature, setSyncedSignature] = useState(profileSignature)
  const [displayName, setDisplayName] = useState(() => profile?.display_name ?? '')
  const [farmName, setFarmName] = useState(() => profile?.farm_name ?? '')
  const [role, setRole] = useState<HarvestRole>(() => profile?.role ?? 'buyer')
  const [defaultArea, setDefaultArea] = useState<string>(() => profile?.default_area || defaultFallbackArea)
  const [savedBanner, setSavedBanner] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [orderAlerts, setOrderAlerts] = useState(true)
  const [freshnessAlerts, setFreshnessAlerts] = useState(true)

  if (profile && profileSignature !== syncedSignature) {
    setSyncedSignature(profileSignature)
    setDisplayName(profile.display_name)
    setFarmName(profile.farm_name ?? '')
    setRole(profile.role)
    setDefaultArea(profile.default_area || defaultFallbackArea)
  }

  useEffect(() => {
    let active = true
    void loadDesignValue<boolean>('pref-order-alerts', true).then((val) => {
      if (active) setOrderAlerts(Boolean(val))
    })
    void loadDesignValue<boolean>('pref-freshness-alerts', true).then((val) => {
      if (active) setFreshnessAlerts(Boolean(val))
    })
    return () => { active = false }
  }, [])

  const areaOptions = useMemo(() => {
    const farmItems = FARM_HUBS.map((hub) => ({ value: hub, label: `${hub} (Farm hub)` }))
    const buyerItems = BUYER_AREAS.map((area) => ({ value: area, label: `${area} (City zone)` }))
    return mode === 'farmer' ? [...farmItems, ...buyerItems] : [...buyerItems, ...farmItems]
  }, [mode])

  const languageOptions = useMemo(
    () => LANGUAGE_OPTIONS.map((item) => ({ value: item.value, label: `${item.label} (${item.nativeLabel})` })),
    [],
  )

  const handleRefresh = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await refreshProfile()
    setRefreshing(false)
  }, [refreshProfile])

  const handlePickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setSaveError('Allow photo library access to choose a profile photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    })
    if (!result.canceled && result.assets[0]?.uri) {
      triggerImpactHaptic()
      setAvatarUri(result.assets[0].uri)
    }
  }, [setAvatarUri, setSaveError])

  const handleSave = useCallback(async () => {
    setSavedBanner(null)
    const result = await updateProfile({
      displayName,
      farmName: role === 'buyer' ? null : farmName,
      role,
      defaultArea,
    })
    if (!result.success) return

    if (role === 'farmer' && activeSpace !== 'farmer') {
      setActiveSpace('farmer')
      router.replace('/farmer')
    } else if (role === 'buyer' && activeSpace !== 'buyer') {
      setActiveSpace('buyer')
      router.replace('/')
    }

    setSavedBanner('Profile updated.')
  }, [activeSpace, defaultArea, displayName, farmName, role, setActiveSpace, updateProfile])

  const isLoadingProfile = Boolean(user && authLoading && !profile)

  return (
    <ScreenScroll keyboardAvoiding onRefresh={handleRefresh} refreshing={refreshing}>
      <AppHeader />

      {isLoadingProfile ? (
        <View style={styles.skeletonWrap}>
          <SkeletonBox height={88} radius={radii.lg} />
          <SkeletonBox height={220} radius={radii.lg} />
          <SkeletonBox height={140} radius={radii.lg} />
        </View>
      ) : (
        <>
          <AnimatedEntrance delay={20}>
            <Card style={styles.identityCard}>
              <View style={styles.avatarRow}>
                {avatarUri ? (
                  <Image contentFit="cover" source={{ uri: avatarUri }} style={styles.avatarPhoto} />
                ) : (
                  <Avatar name={profile?.display_name || 'HarvestLink'} size={64} />
                )}
                <View style={styles.identityCopy}>
                  <Eyebrow>{mode === 'farmer' ? 'FARMER WORKSPACE' : 'ACCOUNT'}</Eyebrow>
                  <Text style={styles.displayName}>{profile?.display_name || 'Complete your profile'}</Text>
                  <Text style={styles.phoneText}>
                    {profile?.phone || user?.phone || 'Verified Nigerian mobile account'}
                  </Text>
                </View>
              </View>

              <View style={styles.avatarActions}>
                <AppButton
                  icon={<Camera color={colors.pine} size={17} />}
                  label={avatarUri ? 'Change Photo' : 'Add Photo'}
                  onPress={() => void handlePickAvatar()}
                  style={styles.flex}
                  variant="secondary"
                />
                {avatarUri ? (
                  <AppButton
                    icon={<Trash2 color={colors.red} size={17} />}
                    label="Remove"
                    onPress={() => {
                      triggerSelectionHaptic()
                      setAvatarUri(null)
                    }}
                    variant="danger"
                  />
                ) : null}
              </View>
            </Card>
          </AnimatedEntrance>

          {profile?.role === 'both' ? (
            <AnimatedEntrance delay={50}>
              <Card style={styles.sectionCard}>
                <View style={styles.modeHead}>
                  <Sprout color={colors.pine} size={20} />
                  <View style={styles.flex}>
                    <Text style={styles.sectionTitle}>Active Workspace</Text>
                    <Text style={styles.helperText}>
                      Switch tabs between shopping the marketplace and managing your farm harvests.
                    </Text>
                  </View>
                </View>
                <SegmentedControl
                  onChange={(nextSpace) => {
                    setActiveSpace(nextSpace)
                    router.replace(nextSpace === 'farmer' ? '/farmer' : '/')
                  }}
                  options={SPACE_OPTIONS}
                  value={activeSpace}
                />
              </Card>
            </AnimatedEntrance>
          ) : null}

          <AnimatedEntrance delay={80}>
            <Card style={styles.sectionCard}>
              <Eyebrow>DETAILS & LOGISTICS</Eyebrow>
              <Text style={styles.sectionTitle}>Profile Settings</Text>

              {profileError ? <MessageBanner>{profileError}</MessageBanner> : null}

              <TextField
                label="Full name"
                onChangeText={setDisplayName}
                placeholder="Your display name"
                value={displayName}
              />

              <Text style={styles.fieldLabel}>Account role</Text>
              <View style={styles.roleList}>
                {ROLE_OPTIONS.map((item) => {
                  const selected = role === item.value
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityLabel={`${item.label}: ${item.caption}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        triggerSelectionHaptic()
                        setRole(item.value)
                      }}
                      style={[styles.roleOption, selected && styles.roleOptionSelected]}
                    >
                      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{item.label}</Text>
                      <Text style={[styles.roleCaption, selected && styles.roleCaptionSelected]}>{item.caption}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {role !== 'buyer' ? (
                <TextField
                  label="Farm or cooperative name"
                  onChangeText={setFarmName}
                  placeholder="e.g. GreenAcres Farmstead"
                  value={farmName}
                />
              ) : null}

              <SelectField
                label={role === 'farmer' ? 'Primary farm hub' : 'Primary area / delivery zone'}
                onChange={setDefaultArea}
                options={areaOptions}
                value={defaultArea}
              />

              <SelectField<AppLanguage>
                label="App language"
                onChange={(nextLang) => setLanguage(nextLang)}
                options={languageOptions}
                value={language}
              />

              {saveError ? <MessageBanner>{saveError}</MessageBanner> : null}
              {savedBanner ? <MessageBanner tone="info">{savedBanner}</MessageBanner> : null}

              <AppButton label={t('saveChanges')} loading={saving} onPress={() => void handleSave()} />
            </Card>
          </AnimatedEntrance>

          <AnimatedEntrance delay={120}>
            <Card style={styles.sectionCard}>
              <Eyebrow>DEVICE ALERT PREFERENCES</Eyebrow>
              <Text style={styles.sectionTitle}>Local reminders</Text>
              <View style={styles.toggleRow}>
                <View style={styles.flex}>
                  <Text style={styles.toggleTitle}>Order status alerts</Text>
                  <Text style={styles.helperText}>Highlight pending requests and delivery milestones on this device.</Text>
                </View>
                <ToggleSwitch
                  label="Order status alerts"
                  onChange={(val) => {
                    setOrderAlerts(val)
                    void saveDesignValue('pref-order-alerts', val)
                  }}
                  value={orderAlerts}
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.flex}>
                  <Text style={styles.toggleTitle}>Short shelf-life reminders</Text>
                  <Text style={styles.helperText}>Surface urgent freshness scan prompts at the top of Updates.</Text>
                </View>
                <ToggleSwitch
                  label="Short shelf-life reminders"
                  onChange={(val) => {
                    setFreshnessAlerts(val)
                    void saveDesignValue('pref-freshness-alerts', val)
                  }}
                  value={freshnessAlerts}
                />
              </View>
            </Card>
          </AnimatedEntrance>

          <AnimatedEntrance delay={160}>
            <Card style={styles.sectionCard}>
              <View style={styles.modeHead}>
                <ShieldCheck color={colors.pine} size={20} />
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>Verification & Session</Text>
                  <Text style={styles.helperText}>
                    Phone numbers are verified by SMS OTP and remain protected across device restarts.
                  </Text>
                </View>
              </View>
              <KeyValueRow label="Verified mobile" value={profile?.phone || user?.phone || 'Active session'} />

              {signOutError ? <MessageBanner>{signOutError}</MessageBanner> : null}

              <AppButton
                icon={<LogOut color={colors.red} size={18} />}
                label={t('signOut')}
                loading={signingOut}
                onPress={() => void signOut()}
                variant="danger"
              />
            </Card>
          </AnimatedEntrance>

          <Text style={styles.versionText}>HarvestLink Mobile · v{appConfig.expo.version}</Text>
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  skeletonWrap: {
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  identityCard: {
    gap: space.md,
    marginBottom: space.md,
  },
  avatarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  avatarPhoto: {
    backgroundColor: colors.paleGreen,
    borderRadius: radii.lg,
    height: 64,
    width: 64,
  },
  identityCopy: {
    flex: 1,
    gap: 3,
  },
  displayName: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 21,
  },
  phoneText: {
    ...typeScale.small,
    color: colors.muted,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  sectionCard: {
    gap: space.sm,
    marginBottom: space.md,
  },
  modeHead: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 18,
  },
  helperText: {
    ...typeScale.small,
    color: colors.muted,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 13,
    marginTop: 4,
  },
  roleList: {
    flexDirection: 'row',
    gap: space.xs,
  },
  roleOption: {
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 68,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  roleOptionSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  roleTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 14,
  },
  roleTitleSelected: {
    color: colors.white,
  },
  roleCaption: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 12,
  },
  roleCaptionSelected: {
    color: '#D8E5DA',
  },
  toggleRow: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingTop: space.sm,
  },
  toggleTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 14,
  },
  versionText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 12,
    marginBottom: space.xl,
    marginTop: space.xs,
    textAlign: 'center',
  },
})
