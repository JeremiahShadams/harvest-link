import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Leaf } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { BUYER_AREAS, FARM_HUBS } from '@/lib/harvestlink/utils'
import type { HarvestRole } from '@/lib/harvestlink/types'
import { usePhoneAuth } from '@/lib/harvestlink/use-data'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { useHarvestLink } from './context'
import { AppButton, Card, colors, Eyebrow, fonts, MessageBanner, TextField } from './ui'

const roleOptions: { value: HarvestRole; title: string; detail: string }[] = [
  { value: 'buyer', title: 'I shop for produce', detail: 'Find fresh harvests close to home.' },
  { value: 'farmer', title: 'I grow produce', detail: 'List your harvest and track orders.' },
  { value: 'both', title: 'A little of both', detail: 'Shop and sell from one account.' },
]

export function PhoneAuthForm() {
  const { t } = useHarvestLink()
  const [step, setStep] = useState<'phone' | 'code' | 'onboarding'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')

  // Onboarding-only fields (never shown or requested for returning users)
  const [name, setName] = useState('')
  const [role, setRole] = useState<HarvestRole>('buyer')
  const [farmName, setFarmName] = useState('')
  const [area, setArea] = useState<string>('Lekki')

  const { sendCode: requestCode, verifyCode: confirmCode, completeOnboarding, busy, error, setError } = usePhoneAuth()

  const handleSendCode = async () => {
    const result = await requestCode(phone)
    if (!result.success) return
    setSentTo(result.phone)
    setPhone(result.phone)
    setStep('code')
  }

  const handleVerifyCode = async () => {
    const result = await confirmCode(sentTo || phone, code)
    if (!result.success) return
    if (result.needsOnboarding) {
      setStep('onboarding')
    }
  }

  const handleCompleteOnboarding = async () => {
    await completeOnboarding({ name, role, farmName, area })
  }

  const areaChoices = role === 'buyer' ? BUYER_AREAS : [...FARM_HUBS, ...BUYER_AREAS]

  return (
    <Card style={styles.card}>
      <View style={styles.mark}><Leaf color={colors.pine} size={20} /></View>

      {step === 'phone' ? (
        <>
          <Eyebrow>ONE-TAP SMS SIGN IN</Eyebrow>
          <Text style={styles.title}>{t('signInTitle')}</Text>
          <Text style={styles.intro}>{t('signInSubtitle')}</Text>
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            placeholder="0801 234 5678"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={18}
            hint="No password needed. Returning accounts sign straight in."
          />
          {error ? <MessageBanner>{error}</MessageBanner> : null}
          <AppButton
            label={busy ? 'Sending code…' : t('continueLabel')}
            icon={<ArrowRight color={colors.white} size={17} />}
            onPress={() => void handleSendCode()}
            loading={busy}
            style={styles.cta}
          />
          <Text style={styles.footnote}>Your number is only used for sign-in and order updates.</Text>
        </>
      ) : step === 'code' ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change phone number"
            onPress={() => {
              setStep('phone')
              setCode('')
              setError(null)
            }}
            style={styles.backLink}
          >
            <ArrowLeft color={colors.pine} size={16} />
            <Text style={styles.backText}>Change number</Text>
          </Pressable>
          <Eyebrow>CHECK YOUR MESSAGES</Eyebrow>
          <Text style={styles.title}>Enter your 6-digit code.</Text>
          <Text style={styles.intro}>
            Sent via SMS to <Text style={styles.phoneValue}>{sentTo}</Text>.
          </Text>
          <View style={styles.field}>
            <Text style={styles.groupLabel}>Verification code</Text>
            <TextInput
              accessibilityLabel="6-digit verification code"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#7A847D"
              style={styles.otpInput}
              value={code}
            />
          </View>
          {error ? <MessageBanner>{error}</MessageBanner> : null}
          <AppButton
            label={busy ? 'Verifying…' : t('verifyCodeLabel')}
            icon={<ArrowRight color={colors.white} size={17} />}
            onPress={() => void handleVerifyCode()}
            loading={busy}
            style={styles.cta}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleSendCode()}
            disabled={busy}
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>Resend code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Eyebrow>WELCOME TO HARVESTLINK</Eyebrow>
          <Text style={styles.title}>Finish setting up your profile.</Text>
          <Text style={styles.intro}>You’re verified. Tell us how you’ll use HarvestLink so we can set up your space.</Text>
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="Ada Okafor"
            autoComplete="name"
            maxLength={80}
          />
          <View style={styles.roleGroup}>
            <Text style={styles.groupLabel}>How will you use HarvestLink?</Text>
            {roleOptions.map((option) => {
              const selected = role === option.value
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    triggerSelectionHaptic()
                    setRole(option.value)
                    if (option.value === 'farmer' && !FARM_HUBS.includes(area as (typeof FARM_HUBS)[number])) {
                      setArea('Ikorodu')
                    }
                  }}
                  style={[styles.roleOption, selected && styles.roleSelected]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <Check color={colors.white} size={12} /> : null}
                  </View>
                  <View style={styles.roleCopy}>
                    <Text style={styles.roleTitle}>{option.title}</Text>
                    <Text style={styles.roleDetail}>{option.detail}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
          {role !== 'buyer' ? (
            <TextField
              label="Farm or cooperative name"
              value={farmName}
              onChangeText={setFarmName}
              placeholder="e.g. Green Acres Ikorodu"
              maxLength={120}
            />
          ) : null}
          <Text style={styles.groupLabel}>
            {role === 'buyer' ? 'Your delivery area' : 'Your farm hub or area'}
          </Text>
          <View style={styles.areaRow}>
            {areaChoices.map((option) => {
              const selected = area === option
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    triggerSelectionHaptic()
                    setArea(option)
                  }}
                  style={[styles.areaChip, selected && styles.areaChipSelected]}
                >
                  <Text style={[styles.areaText, selected && styles.areaTextSelected]}>{option}</Text>
                </Pressable>
              )
            })}
          </View>
          {error ? <MessageBanner>{error}</MessageBanner> : null}
          <AppButton
            label={busy ? 'Creating profile…' : 'Enter HarvestLink'}
            icon={<ArrowRight color={colors.white} size={17} />}
            onPress={() => void handleCompleteOnboarding()}
            loading={busy}
            style={styles.cta}
          />
          <Text style={styles.footnote}>Marketplace activity is supporting evidence only—not a promise of credit.</Text>
        </>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: 16, padding: 20 },
  mark: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 15, height: 44, justifyContent: 'center', width: 44 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 26, letterSpacing: -0.7, lineHeight: 32 },
  intro: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: -6 },
  roleGroup: { gap: 10 },
  groupLabel: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  roleOption: { alignItems: 'center', backgroundColor: colors.creamSubtle, borderColor: colors.line, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 56, padding: 13 },
  roleSelected: { backgroundColor: colors.paleGreen, borderColor: '#AFC0A7' },
  radio: { alignItems: 'center', borderColor: '#9AA397', borderRadius: 99, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 22 },
  radioSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  roleCopy: { flex: 1, gap: 2 },
  roleTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 14 },
  roleDetail: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17 },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14, paddingVertical: 8 },
  areaChipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  areaText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  areaTextSelected: { fontFamily: fonts.bodyBold, color: colors.white },
  cta: { alignSelf: 'stretch', marginTop: 2 },
  footnote: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  backLink: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, minHeight: 44, paddingRight: 12 },
  backText: { fontFamily: fonts.bodyBold, color: colors.pine, fontSize: 14 },
  phoneValue: { fontFamily: fonts.bodyBold, color: colors.ink },
  field: { gap: 8 },
  otpInput: { fontFamily: fonts.heading, backgroundColor: colors.white, borderColor: colors.line, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 24, height: 58, letterSpacing: 8, paddingHorizontal: 14, textAlign: 'center' },
  resendButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  resendText: { fontFamily: fonts.bodyBold, color: colors.pine, fontSize: 13 },
})
