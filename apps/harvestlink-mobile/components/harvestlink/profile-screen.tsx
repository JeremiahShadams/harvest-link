import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { ArrowLeft, Check, LogOut, ShieldCheck } from 'lucide-react-native'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppButton, Card, colors, Eyebrow, MessageBanner, SectionTitle, TextField } from './ui'
import { PhoneAuthForm } from './phone-auth-form'
import { useHarvestLink } from './context'
import { supabase } from '@/lib/supabase'
import { AREAS } from '@/lib/harvestlink/utils'
import type { HarvestRole } from '@/lib/harvestlink/types'

const roleOptions: { value: HarvestRole; label: string }[] = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'both', label: 'Both' },
]

export function ProfileScreen() {
  const { user, profile, authLoading, profileError, refreshProfile } = useHarvestLink()
  const [name, setName] = useState('')
  const [farmName, setFarmName] = useState('')
  const [role, setRole] = useState<HarvestRole>('buyer')
  const [area, setArea] = useState('Lekki')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!profile) return
    setName(profile.display_name)
    setFarmName(profile.farm_name ?? '')
    setRole(profile.role)
    setArea(profile.default_area)
  }, [profile])

  const saveProfile = async () => {
    if (!user || !profile) return
    if (name.trim().length < 2) {
      setMessage('Add a name with at least two characters.')
      return
    }
    setBusy(true)
    setMessage('')
    const { error } = await supabase.from('profiles').update({
      display_name: name.trim(),
      farm_name: farmName.trim() || null,
      role,
      default_area: area,
    }).eq('id', user.id)
    setBusy(false)
    if (error) {
      setMessage('Your profile could not be saved. Check your connection and try again.')
      return
    }
    await refreshProfile()
    setMessage('Your profile and area are saved.')
  }

  const signOut = () => {
    Alert.alert('Sign out of HarvestLink?', 'Your orders and farm activity will be waiting when you return.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { void supabase.auth.signOut() } },
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topline}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={19} color={colors.ink} /></Pressable>
        <Eyebrow>YOUR HARVESTLINK</Eyebrow>
        <View style={styles.toplineSpacer} />
      </View>
      {!user ? (
        <>
          <View style={styles.heading}>
            <Eyebrow>START WITH A SIMPLE HELLO</Eyebrow>
            <Text style={styles.title}>Good things grow together.</Text>
            <Text style={styles.subtitle}>Sign in with your phone to place orders, scan produce, and keep your farm activity in one place.</Text>
          </View>
          <PhoneAuthForm />
        </>
      ) : authLoading && !profile ? (
        <Card style={styles.loadingCard}><Text style={styles.subtitle}>Loading your profile…</Text></Card>
      ) : !profile ? (
        <Card style={styles.loadingCard}>
          <Text style={styles.title}>Finish setting up your profile.</Text>
          <Text style={styles.subtitle}>{profileError ?? 'Your phone is verified. Your profile details are needed to continue.'}</Text>
          <AppButton label="Retry profile load" onPress={() => void refreshProfile()} />
        </Card>
      ) : (
        <>
          <View style={styles.heading}>
            <Eyebrow>YOUR ACCOUNT</Eyebrow>
            <Text style={styles.title}>Your details, in one place.</Text>
            <Text style={styles.subtitle}>Keep your name and delivery area current so farmers know where to meet you.</Text>
          </View>
          <Card style={styles.formCard}>
            <View style={styles.memberRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{profile.display_name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.memberCopy}><Text style={styles.memberName}>{profile.display_name}</Text><Text style={styles.phone}>{profile.phone ?? user.phone ?? 'Verified phone'}</Text></View>
              <ShieldCheck size={20} color={colors.leaf} />
            </View>
            <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" maxLength={80} />
            <View style={styles.group}>
              <Text style={styles.groupLabel}>I use HarvestLink as</Text>
              <View style={styles.roleRow}>
                {roleOptions.map((option) => (
                  <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: role === option.value }} onPress={() => setRole(option.value)} style={[styles.roleChip, role === option.value && styles.roleChipSelected]}>
                    {role === option.value ? <Check size={14} color={colors.white} /> : null}
                    <Text style={[styles.roleText, role === option.value && styles.roleTextSelected]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {role !== 'buyer' ? <TextField label="Farm or cooperative name" value={farmName} onChangeText={setFarmName} placeholder="Your farm name" maxLength={120} /> : null}
            <View style={styles.group}>
              <Text style={styles.groupLabel}>Your area</Text>
              <View style={styles.areaRow}>
                {AREAS.map((option) => (
                  <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: area === option }} onPress={() => setArea(option)} style={[styles.areaChip, area === option && styles.areaChipSelected]}>
                    <Text style={[styles.areaText, area === option && styles.areaTextSelected]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {message ? <MessageBanner tone={message.includes('saved') ? 'info' : 'error'}>{message}</MessageBanner> : null}
            <AppButton label={busy ? 'Saving…' : 'Save changes'} onPress={() => void saveProfile()} loading={busy} />
          </Card>
          <Card style={styles.securityCard}>
            <ShieldCheck color={colors.leaf} size={19} />
            <View style={styles.securityCopy}><Text style={styles.securityTitle}>Private by design</Text><Text style={styles.subtitle}>Your phone is used for sign-in and order updates. Your farm activity is only shared when you create a report link.</Text></View>
          </Card>
          <AppButton label="Sign out" onPress={signOut} variant="quiet" icon={<LogOut color={colors.pine} size={16} />} style={styles.signOut} />
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', gap: 18, maxWidth: 500, paddingBottom: 40, paddingHorizontal: 18, paddingTop: 12, width: '100%' },
  topline: { alignItems: 'center', flexDirection: 'row', gap: 11, minHeight: 42 },
  backButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 13, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  toplineSpacer: { flex: 1 },
  heading: { gap: 8, paddingBottom: 2, paddingTop: 8 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '700', letterSpacing: -1, lineHeight: 35 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  loadingCard: { gap: 12 },
  formCard: { gap: 19 },
  memberRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingBottom: 17 },
  avatar: { alignItems: 'center', backgroundColor: colors.pine, borderRadius: 18, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { color: colors.white, fontSize: 19, fontWeight: '700' },
  memberCopy: { flex: 1, gap: 3 },
  memberName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  phone: { color: colors.muted, fontSize: 12 },
  group: { gap: 9 },
  groupLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 40 },
  roleChipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  roleText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  roleTextSelected: { color: colors.white },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  areaChip: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  areaChipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  areaText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  areaTextSelected: { color: colors.white },
  securityCard: { alignItems: 'flex-start', flexDirection: 'row', gap: 11 },
  securityCopy: { flex: 1, gap: 4 },
  securityTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  signOut: { alignSelf: 'stretch' },
})
