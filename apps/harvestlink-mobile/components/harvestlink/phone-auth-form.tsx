import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Leaf } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AREAS } from '@/lib/harvestlink/utils'
import type { HarvestRole } from '@/lib/harvestlink/types'
import { usePhoneAuth } from '@/lib/harvestlink/use-data'
import { AppButton, Card, colors, Eyebrow, MessageBanner, TextField } from './ui'

const roleOptions: { value: HarvestRole; title: string; detail: string }[] = [
  { value: 'buyer', title: 'I shop for produce', detail: 'Find fresh harvests close to home.' },
  { value: 'farmer', title: 'I grow produce', detail: 'List your harvest and track orders.' },
  { value: 'both', title: 'A little of both', detail: 'Shop and sell from one account.' },
]

export function PhoneAuthForm() {
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<HarvestRole>('buyer')
  const [farmName, setFarmName] = useState('')
  const [area, setArea] = useState('Lekki')
  const [sentTo, setSentTo] = useState('')
  const { sendCode: requestCode, verifyCode: confirmCode, busy, error, setError } = usePhoneAuth()

  const sendCode = async () => {
    const result = await requestCode({ phone, name, role, farmName, area })
    if (!result.success) return
    setSentTo(result.phone)
    setPhone(result.phone)
    setStep('code')
  }

  const verifyCode = async () => {
    await confirmCode({ phone, token: code, name, role, farmName, area })
  }

  return (
    <Card style={styles.card}>
      <View style={styles.mark}><Leaf color={colors.pine} size={20} /></View>
      {step === 'details' ? (
        <>
          <Eyebrow>A GOOD THING STARTS HERE</Eyebrow>
          <Text style={styles.title}>A little closer to fresh.</Text>
          <Text style={styles.intro}>Use your phone to keep orders, scans, and your farm activity together.</Text>
          <TextField label="Your name" value={name} onChangeText={setName} placeholder="Ada Okafor" autoComplete="name" maxLength={80} />
          <TextField label="Mobile number" value={phone} onChangeText={setPhone} placeholder="0801 234 5678" keyboardType="phone-pad" autoComplete="tel" maxLength={18} />
          <Text style={styles.helper}>We’ll send a one-time code by SMS. No password to remember.</Text>
          <View style={styles.roleGroup}>
            <Text style={styles.groupLabel}>How will you use HarvestLink?</Text>
            {roleOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: role === option.value }}
                onPress={() => setRole(option.value)}
                style={[styles.roleOption, role === option.value && styles.roleSelected]}
              >
                <View style={[styles.radio, role === option.value && styles.radioSelected]}>{role === option.value ? <Check color={colors.white} size={12} /> : null}</View>
                <View style={styles.roleCopy}><Text style={styles.roleTitle}>{option.title}</Text><Text style={styles.roleDetail}>{option.detail}</Text></View>
              </Pressable>
            ))}
          </View>
          {role !== 'buyer' ? <TextField label="Farm or cooperative name" value={farmName} onChangeText={setFarmName} placeholder="Your farm name" maxLength={120} /> : null}
          <Text style={styles.groupLabel}>Your area</Text>
          <View style={styles.areaRow}>
            {AREAS.map((option) => (
              <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: area === option }} onPress={() => setArea(option)} style={[styles.areaChip, area === option && styles.areaChipSelected]}>
                <Text style={[styles.areaText, area === option && styles.areaTextSelected]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <MessageBanner>{error}</MessageBanner> : null}
          <AppButton label={busy ? 'Sending code…' : 'Continue with phone'} icon={<ArrowRight color={colors.white} size={17} />} onPress={() => void sendCode()} loading={busy} style={styles.cta} />
          <Text style={styles.footnote}>Marketplace activity is supporting evidence only—not a promise of credit.</Text>
        </>
      ) : (
        <>
          <Pressable accessibilityRole="button" onPress={() => { setStep('details'); setCode(''); setError(null) }} style={styles.backLink}>
            <ArrowLeft color={colors.pine} size={16} /><Text style={styles.backText}>Change number</Text>
          </Pressable>
          <Eyebrow>CHECK YOUR MESSAGES</Eyebrow>
          <Text style={styles.title}>Your code is on its way.</Text>
          <Text style={styles.intro}>Enter the 6-digit code sent to <Text style={styles.phoneValue}>{sentTo}</Text>.</Text>
          <View style={styles.field}>
            <Text style={styles.groupLabel}>Verification code</Text>
            <TextInput
              accessibilityLabel="6-digit verification code"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#899188"
              style={styles.otpInput}
              value={code}
            />
          </View>
          {error ? <MessageBanner>{error}</MessageBanner> : null}
          <AppButton label={busy ? 'Verifying…' : 'Verify and continue'} icon={<ArrowRight color={colors.white} size={17} />} onPress={() => void verifyCode()} loading={busy} style={styles.cta} />
          <Text style={styles.footnote}>Your number is only used for sign-in and order updates.</Text>
        </>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: 15, padding: 20 },
  mark: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 15, height: 44, justifyContent: 'center', width: 44 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '700', letterSpacing: -0.8, lineHeight: 32 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -7 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -7 },
  roleGroup: { gap: 8 },
  groupLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  roleOption: { alignItems: 'center', backgroundColor: '#FCFBF8', borderColor: colors.line, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 12 },
  roleSelected: { backgroundColor: '#F1F5EE', borderColor: '#AFC0A7' },
  radio: { alignItems: 'center', borderColor: '#B9C0B6', borderRadius: 99, borderWidth: 1.5, height: 20, justifyContent: 'center', width: 20 },
  radioSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  roleCopy: { flex: 1, gap: 2 },
  roleTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  roleDetail: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  areaChip: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  areaChipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  areaText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  areaTextSelected: { color: colors.white },
  cta: { alignSelf: 'stretch', marginTop: 2 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  backLink: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6 },
  backText: { color: colors.pine, fontSize: 13, fontWeight: '600' },
  phoneValue: { color: colors.ink, fontWeight: '700' },
  field: { gap: 8 },
  otpInput: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 24, fontWeight: '700', height: 58, letterSpacing: 8, paddingHorizontal: 14, textAlign: 'center' },
})
