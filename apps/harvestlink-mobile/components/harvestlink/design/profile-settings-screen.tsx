import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  CircleQuestionMark,
  Globe,
  LogOut,
  MapPin,
  Plus,
  Smartphone,
  Trash,
} from 'lucide-react-native'
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHarvestLink } from '../context'
import { DesignScreen, DesignSelect, DesignToggle } from './ui'
import { body, C, DESIGN_PROFILE_IMAGE, heading, R, shadow } from './tokens'
import { loadDesignValue, saveDesignValue } from '@/lib/harvestlink/design-local'
import { useSignOut, useUpdateProfile } from '@/lib/harvestlink/use-data'

type PushTiming = 'realtime' | 'hourly' | 'daily'

type ProfilePrefs = {
  farmSize: string
  gps: string
  crops: string[]
  orderNotifications: boolean
  deliveryUpdates: boolean
  priceAlerts: boolean
  pushTiming: PushTiming
  language: string
}

const DEFAULT_PREFS: ProfilePrefs = {
  farmSize: '',
  gps: '',
  crops: [],
  orderNotifications: true,
  deliveryUpdates: true,
  priceAlerts: false,
  pushTiming: 'realtime',
  language: 'English',
}

const PUSH_OPTIONS: { value: PushTiming; label: string }[] = [
  { value: 'realtime', label: 'Real-time (Immediate)' },
  { value: 'hourly', label: 'Hourly Digest' },
  { value: 'daily', label: 'Daily Summary' },
]

const LANGUAGES = ['English', 'Français', 'Pidgin']

export function ProfileSettingsScreen({ showBottomNav = true }: { showBottomNav?: boolean }) {
  const insets = useSafeAreaInsets()
  const { user, profile } = useHarvestLink()
  const { updateProfile, busy } = useUpdateProfile()
  const { signOut: performSignOut } = useSignOut()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [farmName, setFarmName] = useState('')
  const [syncedProfileId, setSyncedProfileId] = useState('')
  const [avatarUri, setAvatarUri] = useState(DESIGN_PROFILE_IMAGE)
  const [editingAccount, setEditingAccount] = useState(false)
  const [editingFarm, setEditingFarm] = useState(false)
  const [prefs, setPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [modal, setModal] = useState<'crop' | 'language' | null>(null)
  const [newCrop, setNewCrop] = useState('')

  if (profile && profile.id !== syncedProfileId) {
    setSyncedProfileId(profile.id)
    setFullName(profile.display_name || '')
    setPhone(profile.phone || '')
    setFarmName(profile.farm_name || '')
  }

  useEffect(() => {
    let active = true
    void loadDesignValue('profile-prefs', DEFAULT_PREFS).then((saved) => {
      if (active) {
        setPrefs({ ...DEFAULT_PREFS, ...saved })
        setPrefsLoaded(true)
      }
    })
    void loadDesignValue('profile-avatar', DESIGN_PROFILE_IMAGE).then((saved) => {
      if (active && typeof saved === 'string' && saved) setAvatarUri(saved)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (prefsLoaded) void saveDesignValue('profile-prefs', prefs)
  }, [prefs, prefsLoaded])

  const updatePrefs = (patch: Partial<ProfilePrefs>) => setPrefs((current) => ({ ...current, ...patch }))

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.navigate('/farmer' as never)
  }

  const changeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (result.canceled) return
    const uri = result.assets[0]?.uri
    if (!uri) return
    setAvatarUri(uri)
    await saveDesignValue('profile-avatar', uri)
    Alert.alert('Profile photo updated', 'The new photo is saved on this device.')
  }

  const saveAccount = async () => {
    if (!editingAccount) {
      setEditingAccount(true)
      return
    }
    if (fullName.trim().length < 2) {
      Alert.alert('Check your name', 'Add a name with at least two characters.')
      return
    }
    if (!user || !profile) {
      Alert.alert('Profile not connected', 'Sign in before saving account changes.')
      return
    }
    const result = await updateProfile({
      displayName: fullName.trim(),
      phone: phone.trim() || null,
    })
    if (!result.success) {
      Alert.alert('Profile not saved', result.error ?? 'Check your connection and try again.')
      return
    }
    setEditingAccount(false)
    Alert.alert('Profile updated', 'Your account information is saved.')
  }

  const saveFarm = async () => {
    if (!editingFarm) {
      setEditingFarm(true)
      return
    }
    if (user && profile) {
      const result = await updateProfile({
        farmName: farmName.trim() || null,
      })
      if (!result.success) {
        Alert.alert('Farm details not saved', result.error ?? 'Check your connection and try again.')
        return
      }
    }
    setEditingFarm(false)
    Alert.alert('Farm details saved', 'Your farm size, GPS, and crops are saved on this device.')
  }

  const addCrop = () => {
    const crop = newCrop.trim()
    if (!crop) return
    updatePrefs({ crops: [...prefs.crops, crop] })
    setNewCrop('')
    setModal(null)
  }

  const signOut = () => {
    Alert.alert('Sign out of HarvestLink?', 'Your orders and farm activity will be waiting when you return.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { void performSignOut() } },
    ])
  }

  const deleteAccount = () => {
    Alert.alert(
      'Delete account not available',
      'This build has no account-deletion service connected, so your account was not changed.',
    )
  }

  const displayName = shortDisplayName(fullName)
  const email = user?.email ?? ''

  return (
    <>
      <View style={[styles.header, { paddingTop: 56 + insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedSmall]}
          >
            <ArrowLeft color={C.slate700} size={20} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <DesignScreen activeTab="profile" showBottomNav={showBottomNav} contentStyle={[styles.content, !showBottomNav && styles.contentWithoutNav]}>
        <View style={styles.profileCard}>
          <View style={styles.profileBanner} />
          <View style={styles.avatarBlock}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={() => void changeAvatar()}
              style={({ pressed }) => [styles.cameraButton, pressed && styles.pressedSmall]}
            >
              <Camera color={C.white} size={14} />
            </Pressable>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <View style={styles.profileLocation}>
            <MapPin color={C.farm600} size={14} style={styles.profileLocationIcon} />
            <Text style={styles.profileLocationText}>{profile?.default_area || 'No area set'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Account Information</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={editingAccount ? 'Save account information' : 'Edit account information'} onPress={() => void saveAccount()} disabled={busy}>
              <Text style={styles.editText}>{editingAccount ? 'Save' : 'Edit'}</Text>
            </Pressable>
          </View>
          <View style={styles.fieldList}>
            <ProfileField label="Full Name" value={fullName} onChangeText={setFullName} editable={editingAccount} />
            <ProfileField label="Phone Number" value={phone} onChangeText={setPhone} editable={editingAccount} keyboardType="phone-pad" />
            <ProfileField label="Email Address" value={email} editable={false} keyboardType="email-address" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Farm Details</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={editingFarm ? 'Save farm details' : 'Edit farm details'} onPress={() => void saveFarm()} disabled={busy}>
              <Text style={styles.editText}>{editingFarm ? 'Save' : 'Edit'}</Text>
            </Pressable>
          </View>
          <View style={styles.fieldList}>
            <ProfileField label="Farm Name" value={farmName} onChangeText={setFarmName} editable={editingFarm} />
            <View style={styles.fieldGrid}>
              <View style={styles.fieldGridItem}>
                <ProfileField label="Farm Size (Acres)" value={prefs.farmSize} onChangeText={(value) => updatePrefs({ farmSize: value })} editable={editingFarm} />
              </View>
              <View style={styles.fieldGridItem}>
                <ProfileField label="Location/GPS" value={prefs.gps} onChangeText={(value) => updatePrefs({ gps: value })} editable={editingFarm} />
              </View>
            </View>
            <View>
              <Text style={[styles.fieldLabel, styles.cropLabel]}>Primary Crops</Text>
              <View style={styles.cropRow}>
                {prefs.crops.map((crop) => (
                  <View key={crop} style={styles.cropChip}><Text style={styles.cropText}>{crop}</Text></View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add primary crop"
                  onPress={() => setModal('crop')}
                  style={({ pressed }) => [styles.addCropButton, pressed && styles.pressed]}
                >
                  <Plus color={C.slate500} size={12} />
                  <Text style={styles.addCropText}>Add</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, styles.cardTitleMargin]}>Notification Preferences</Text>
          <View style={styles.preferenceList}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Order Notifications</Text>
                <Text style={styles.toggleSubtitle}>Alerts for new and updated orders</Text>
              </View>
              <DesignToggle
                label="Order Notifications"
                onChange={(value) => updatePrefs({ orderNotifications: value })}
                value={prefs.orderNotifications}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Delivery Updates</Text>
                <Text style={styles.toggleSubtitle}>When produce is out for delivery</Text>
              </View>
              <DesignToggle
                label="Delivery Updates"
                onChange={(value) => updatePrefs({ deliveryUpdates: value })}
                value={prefs.deliveryUpdates}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Price Alerts</Text>
                <Text style={styles.toggleSubtitle}>Market price fluctuations for your crops</Text>
              </View>
              <DesignToggle
                label="Price Alerts"
                onChange={(value) => updatePrefs({ priceAlerts: value })}
                value={prefs.priceAlerts}
              />
            </View>
            <View style={styles.timingBlock}>
              <Text style={styles.timingLabel}>Push Notification Timing</Text>
              <DesignSelect
                accessibilityLabel="Push Notification Timing"
                onChange={(value) => updatePrefs({ pushTiming: value })}
                options={PUSH_OPTIONS}
                value={prefs.pushTiming}
              />
            </View>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Language"
            onPress={() => setModal('language')}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressedRow]}
          >
            <View style={styles.settingsLeft}><Globe color={C.slate400} size={20} /><Text style={styles.settingsLabel}>Language</Text></View>
            <View style={styles.settingsRight}><Text style={styles.settingsValue}>{prefs.language}</Text><ChevronRight color={C.slate400} size={14} /></View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Help and Support"
            onPress={() => Alert.alert('Help & Support', 'Support requests are not connected in this build.')}
            style={({ pressed }) => [styles.settingsRow, styles.settingsRowBorder, pressed && styles.pressedRow]}
          >
            <View style={styles.settingsLeft}><CircleQuestionMark color={C.slate400} size={20} /><Text style={styles.settingsLabel}>Help &amp; Support</Text></View>
            <ChevronRight color={C.slate400} size={14} />
          </Pressable>
          <View style={[styles.settingsRow, styles.settingsRowLast]}>
            <View style={styles.settingsLeft}><Smartphone color={C.slate400} size={20} /><Text style={styles.versionLabel}>App Version</Text></View>
            <Text style={styles.versionText}>v2.0.4 (Build 402)</Text>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log Out"
            onPress={signOut}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          >
            <LogOut color={C.slate700} size={18} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete Account"
            onPress={deleteAccount}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Trash color={C.red600} size={18} />
            <Text style={styles.deleteText}>Delete Account</Text>
          </Pressable>
        </View>
        <View style={styles.bottomSpacer} />
      </DesignScreen>

      <Modal animationType="fade" transparent visible={modal === 'crop'} onRequestClose={() => setModal(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close add crop" onPress={() => setModal(null)} style={styles.modalBackdrop}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Primary Crop</Text>
            <TextInput
              accessibilityLabel="New primary crop"
              autoFocus
              onChangeText={setNewCrop}
              placeholder="e.g. Cassava"
              placeholderTextColor={C.slate400}
              style={styles.modalInput}
              value={newCrop}
            />
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => setModal(null)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Add crop" onPress={addCrop} style={styles.modalConfirm}><Text style={styles.modalConfirmText}>Add</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={modal === 'language'} onRequestClose={() => setModal(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close language selector" onPress={() => setModal(null)} style={styles.modalBackdrop}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Language</Text>
            {LANGUAGES.map((language) => (
              <Pressable
                key={language}
                accessibilityRole="button"
                accessibilityLabel={language}
                accessibilityState={{ selected: language === prefs.language }}
                onPress={() => {
                  updatePrefs({ language })
                  setModal(null)
                }}
                style={({ pressed }) => [styles.languageOption, pressed && styles.pressedRow]}
              >
                <Text style={styles.languageText}>{language}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function ProfileField({
  label,
  value,
  onChangeText,
  editable = false,
  keyboardType = 'default',
}: {
  label: string
  value: string
  onChangeText?: (value: string) => void
  editable?: boolean
  keyboardType?: 'default' | 'phone-pad' | 'email-address'
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={[styles.fieldInput, editable && styles.fieldInputEditing]}
        value={value}
      />
    </View>
  )
}

function shortDisplayName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
  return parts[0] || 'Adebayo O.'
}

const styles = StyleSheet.create({
  header: { backgroundColor: C.white80, borderBottomColor: C.slate100, borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 16, position: 'relative', zIndex: 30 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { alignItems: 'center', backgroundColor: C.slate100, borderRadius: R.pill, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700', left: 0, position: 'absolute', right: 0, textAlign: 'center' }),
  headerSpacer: { height: 40, width: 40 },
  pressed: { transform: [{ scale: 0.98 }] },
  pressedSmall: { transform: [{ scale: 0.95 }] },
  pressedRow: { backgroundColor: C.slate50 },
  content: { gap: 24, paddingBottom: 112, paddingHorizontal: 20, paddingTop: 24 },
  contentWithoutNav: { paddingBottom: 24 },
  profileCard: { alignItems: 'center', backgroundColor: C.white, borderColor: C.slate100, borderRadius: R['3xl'], borderWidth: 1, overflow: 'hidden', paddingBottom: 24, paddingHorizontal: 24, paddingTop: 24, ...shadow.sm },
  profileBanner: { backgroundColor: C.farm800, height: 96, left: 0, position: 'absolute', right: 0, top: 0, width: '100%' },
  avatarBlock: { marginBottom: 12, marginTop: 32, position: 'relative' },
  avatarWrap: { backgroundColor: C.slate100, borderColor: C.white, borderRadius: R.pill, borderWidth: 4, height: 96, overflow: 'hidden', ...shadow.avatar, width: 96 },
  avatar: { height: '100%', width: '100%' },
  cameraButton: { alignItems: 'center', backgroundColor: C.amber500, borderColor: C.white, borderRadius: R.pill, borderWidth: 2, bottom: 0, height: 32, justifyContent: 'center', position: 'absolute', right: 0, ...shadow.sm, width: 32 },
  profileName: heading({ color: C.slate900, fontSize: 24, fontWeight: '700', marginBottom: 4 }),
  profileLocation: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  profileLocationIcon: { marginRight: 6 },
  profileLocationText: body({ color: C.slate500, fontSize: 14 }),
  verifiedBadge: { alignItems: 'center', backgroundColor: C.farm50, borderRadius: R.pill, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  verifiedText: body({ color: C.farm700, fontSize: 12, fontWeight: '600' }),
  card: { backgroundColor: C.white, borderColor: C.slate100, borderRadius: R['3xl'], borderWidth: 1, padding: 20, ...shadow.sm },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700' }),
  cardTitleMargin: { marginBottom: 16 },
  editText: body({ color: C.farm700, fontSize: 14, fontWeight: '600' }),
  fieldList: { gap: 16 },
  fieldGrid: { flexDirection: 'row', gap: 12 },
  fieldGridItem: { flex: 1 },
  fieldLabel: body({ color: C.slate500, fontSize: 12, fontWeight: '500', marginBottom: 4 }),
  cropLabel: { marginBottom: 8 },
  fieldInput: body({ backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, minHeight: 46, paddingHorizontal: 16, paddingVertical: 12, width: '100%' }),
  fieldInputEditing: { borderColor: C.farm600 },
  cropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropChip: { backgroundColor: C.farm50, borderColor: C.farm100, borderRadius: R.lg, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  cropText: body({ color: C.farm700, fontSize: 12, fontWeight: '500' }),
  addCropButton: { alignItems: 'center', backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.lg, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingVertical: 6 },
  addCropText: body({ color: C.slate500, fontSize: 12, fontWeight: '500' }),
  preferenceList: { gap: 20 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  toggleCopy: { flex: 1, paddingRight: 16 },
  toggleTitle: body({ color: C.slate900, fontSize: 14, fontWeight: '600' }),
  toggleSubtitle: body({ color: C.slate500, fontSize: 12, marginTop: 2 }),
  timingBlock: { borderTopColor: C.slate100, borderTopWidth: 1, gap: 8, paddingTop: 8 },
  timingLabel: body({ color: C.slate900, fontSize: 14, fontWeight: '600' }),
  settingsCard: { backgroundColor: C.white, borderColor: C.slate100, borderRadius: R['3xl'], borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  settingsRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 60, paddingHorizontal: 20, paddingVertical: 20 },
  settingsRowBorder: { borderTopColor: C.slate100, borderTopWidth: 1 },
  settingsRowLast: { backgroundColor: C.slate50, borderTopColor: C.slate100, borderTopWidth: 1 },
  settingsLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  settingsRight: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  settingsLabel: body({ color: C.slate700, fontSize: 14, fontWeight: '500' }),
  settingsValue: body({ color: C.slate500, fontSize: 14 }),
  versionLabel: body({ color: C.slate500, fontSize: 14, fontWeight: '500' }),
  versionText: body({ color: C.slate400, fontSize: 12 }),
  bottomActions: { gap: 12, paddingTop: 8 },
  logoutButton: { alignItems: 'center', backgroundColor: C.white, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', ...shadow.sm },
  logoutText: body({ color: C.slate700, fontSize: 14, fontWeight: '700' }),
  deleteButton: { alignItems: 'center', backgroundColor: C.red50, borderRadius: R.xl, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center' },
  deleteText: body({ color: C.red600, fontSize: 14, fontWeight: '700' }),
  bottomSpacer: { height: 24 },
  modalBackdrop: { alignItems: 'center', backgroundColor: C.black40, flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: C.white, borderRadius: R['2xl'], padding: 20, width: '100%' },
  modalTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700', marginBottom: 16 }),
  modalInput: body({ backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, marginBottom: 16, minHeight: 46, paddingHorizontal: 16 }),
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: body({ color: C.slate600, fontSize: 14, fontWeight: '600' }),
  modalConfirm: { backgroundColor: C.farm800, borderRadius: R.lg, paddingHorizontal: 20, paddingVertical: 10 },
  modalConfirmText: body({ color: C.white, fontSize: 14, fontWeight: '700' }),
  languageOption: { paddingHorizontal: 12, paddingVertical: 14 },
  languageText: body({ color: C.slate900, fontSize: 14, fontWeight: '500' }),
})
