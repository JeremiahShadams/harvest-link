'use client'

import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Leaf, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizeNigerianPhone, type HarvestRole, type Profile } from '@/lib/harvestlink/types'

type AuthDialogProps = {
  open: boolean
  initialRole: HarvestRole
  onClose: () => void
  onComplete: (profile: Profile) => void
}

const roleOptions: { value: HarvestRole; title: string; copy: string }[] = [
  { value: 'buyer', title: 'I shop for produce', copy: 'Find the freshest harvest nearby.' },
  { value: 'farmer', title: 'I grow produce', copy: 'List your harvest and build your record.' },
  { value: 'both', title: 'A little of both', copy: 'Shop and sell from one account.' },
]

function explainAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('rate') || normalized.includes('too many')) return 'Too many code requests. Please wait a little and try again.'
  if (normalized.includes('phone_provider_disabled') || normalized.includes('phone auth')) return 'Phone sign-in is not enabled for this project yet. Ask your project administrator to enable SMS sign-in.'
  return 'We couldn’t complete phone verification. Check the number or code and try again.'
}

export function AuthDialog({ open, initialRole, onClose, onComplete }: AuthDialogProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<HarvestRole>(initialRole)
  const [farmName, setFarmName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const normalizedPhone = normalizeNigerianPhone(phone)
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      setError('Enter a valid phone number, including your country code.')
      return
    }
    if (name.trim().length < 2) {
      setError('Add your name so farmers know who they’re meeting.')
      return
    }

    setBusy(true)
    const { error: otpError } = await createClient().auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
        data: { display_name: name.trim(), role, farm_name: farmName.trim() || null },
      },
    })
    setBusy(false)
    if (otpError) {
      setError(explainAuthError(otpError.message))
      return
    }
    setPhone(normalizedPhone)
    setStep('code')
  }

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code sent to your phone.')
      return
    }

    setBusy(true)
    const supabase = createClient()
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code.trim(),
      type: 'sms',
    })
    if (verifyError || !data.user) {
      setBusy(false)
      setError(explainAuthError(verifyError?.message ?? 'verification_failed'))
      return
    }

    const profile: Profile = {
      id: data.user.id,
      display_name: name.trim() || String(data.user.user_metadata?.display_name ?? 'HarvestLink member'),
      phone: data.user.phone ?? phone,
      role,
      default_area: String(data.user.user_metadata?.default_area ?? 'Lekki'),
      farm_name: farmName.trim() || null,
    }
    const { error: profileError } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' })
    setBusy(false)
    if (profileError) {
      setError('Your number is verified, but we couldn’t finish setting up your profile. Please try again.')
      return
    }
    onComplete(profile)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Close phone sign-in"><X aria-hidden="true" /></button>
        <div className="auth-mark"><Leaf aria-hidden="true" /></div>
        {step === 'phone' ? (
          <>
            <span className="eyebrow">A GOOD THING STARTS HERE</span>
            <h2 id="auth-title">A little closer to fresh.</h2>
            <p className="auth-description">Use your phone to keep orders, scans, and your farm activity together.</p>
            <form className="auth-form" onSubmit={sendCode}>
              <label className="field-label" htmlFor="auth-name">Your name</label>
              <input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Ada Okafor" required />
              <label className="field-label" htmlFor="auth-phone">Mobile number</label>
              <input id="auth-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="0801 234 5678" required />
              <span className="field-help">We&apos;ll send a one-time code by SMS. No password to remember.</span>
              <fieldset className="role-picker">
                <legend className="field-label">How will you use HarvestLink?</legend>
                {roleOptions.map((option) => (
                  <label className={`role-option${role === option.value ? ' is-selected' : ''}`} key={option.value}>
                    <input type="radio" name="harvest-role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)} />
                    <span className="role-check"><Check aria-hidden="true" /></span>
                    <span><strong>{option.title}</strong><small>{option.copy}</small></span>
                  </label>
                ))}
              </fieldset>
              {(role === 'farmer' || role === 'both') && (
                <>
                  <label className="field-label" htmlFor="auth-farm-name">Farm or cooperative name</label>
                  <input id="auth-farm-name" value={farmName} onChange={(event) => setFarmName(event.target.value)} placeholder="Your farm name" />
                </>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? 'Sending code…' : 'Continue with phone'} <ArrowRight aria-hidden="true" />
              </button>
            </form>
            <p className="auth-footnote">By continuing, you agree to use marketplace activity as supporting evidence only—not a promise of credit.</p>
          </>
        ) : (
          <>
            <button className="back-link" onClick={() => { setStep('phone'); setCode(''); setError('') }}><ArrowLeft aria-hidden="true" /> Change number</button>
            <span className="eyebrow">CHECK YOUR MESSAGES</span>
            <h2 id="auth-title">Your code is on its way.</h2>
            <p className="auth-description">Enter the 6-digit code sent to <strong>{phone}</strong>.</p>
            <form className="auth-form" onSubmit={verifyCode}>
              <label className="field-label" htmlFor="auth-code">Verification code</label>
              <input id="auth-code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" autoFocus required />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify and continue'} <ArrowRight aria-hidden="true" />
              </button>
            </form>
            <p className="auth-footnote">Your number is only used for sign-in and order updates.</p>
          </>
        )}
      </section>
    </div>
  )
}
