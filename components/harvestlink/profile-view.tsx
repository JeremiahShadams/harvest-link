'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Check, CircleUserRound, LoaderCircle, MapPin, Phone, ShieldCheck } from 'lucide-react'
import type { HarvestRole, Profile } from '@/lib/harvestlink/types'

type ProfileFields = Pick<Profile, 'display_name' | 'role' | 'default_area' | 'farm_name'>

type ProfileViewProps = {
  profile: Profile | null
  areas: string[]
  loading: boolean
  loadError: boolean
  signedIn: boolean
  busy: boolean
  onSave: (fields: ProfileFields) => Promise<string | null>
  onSignIn: () => void
  onRetry: () => void
}

const roleOptions: { value: HarvestRole; title: string; copy: string }[] = [
  { value: 'buyer', title: 'Buyer', copy: 'Shop fresh produce from nearby farms.' },
  { value: 'farmer', title: 'Farmer', copy: 'Share harvests and grow your farm record.' },
  { value: 'both', title: 'Both', copy: 'Buy and sell from one account.' },
]

export function ProfileView({ profile, areas, loading, loadError, signedIn, busy, onSave, onSignIn, onRetry }: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [role, setRole] = useState<HarvestRole>(profile?.role ?? 'buyer')
  const [defaultArea, setDefaultArea] = useState(profile?.default_area ?? areas[0] ?? '')
  const [farmName, setFarmName] = useState(profile?.farm_name ?? '')
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
  }, [profile?.display_name])

  useEffect(() => {
    setRole(profile?.role ?? 'buyer')
  }, [profile?.role])

  useEffect(() => {
    setDefaultArea(profile?.default_area ?? areas[0] ?? '')
  }, [areas, profile?.default_area])

  useEffect(() => {
    setFarmName(profile?.farm_name ?? '')
  }, [profile?.farm_name])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSaved(false)
    const error = await onSave({
      display_name: displayName.trim(),
      role,
      default_area: defaultArea,
      farm_name: farmName.trim() || null,
    })
    if (error) {
      setFormError(error)
      return
    }
    setSaved(true)
  }

  return (
    <div className="profile-page page-stack">
      <div className="profile-page-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> YOUR HARVESTLINK</span>
        <h1>Profile &amp; location</h1>
        <p>Keep your account details and delivery area up to date.</p>
      </div>

      {!signedIn ? (
        <section className="profile-message-card" aria-labelledby="profile-sign-in-title">
          <span className="profile-message-icon"><CircleUserRound aria-hidden="true" /></span>
          <div>
            <h2 id="profile-sign-in-title">Your profile, all in one place.</h2>
            <p>Sign in with your phone to manage your HarvestLink details and saved delivery area.</p>
            <button className="button button-primary" onClick={onSignIn}>Continue with phone <ArrowRight aria-hidden="true" /></button>
          </div>
        </section>
      ) : loading ? (
        <div className="profile-loading-card" role="status" aria-label="Loading profile">
          <LoaderCircle className="spin-icon" aria-hidden="true" /> Loading your profile…
        </div>
      ) : loadError || !profile ? (
        <section className="profile-message-card" aria-labelledby="profile-load-error-title">
          <span className="profile-message-icon"><CircleUserRound aria-hidden="true" /></span>
          <div>
            <h2 id="profile-load-error-title">Your profile isn&apos;t available right now.</h2>
            <p>We couldn&apos;t load your account details. Try again to reconnect to your profile.</p>
            <button className="button button-outline" onClick={onRetry}>Try again <ArrowRight aria-hidden="true" /></button>
          </div>
        </section>
      ) : (
        <div className="profile-layout">
          <aside className="profile-summary-card" aria-label="Account information">
            <div className="profile-summary-identity">
              <span className="profile-avatar-large" aria-hidden="true">{profile.display_name.slice(0, 1).toUpperCase()}</span>
              <div><span className="eyebrow">HARVESTLINK MEMBER</span><h2>{profile.display_name}</h2></div>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-icon"><Phone aria-hidden="true" /></span>
              <span><small>VERIFIED PHONE</small><strong>{profile.phone || 'Not available'}</strong></span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-icon"><MapPin aria-hidden="true" /></span>
              <span><small>DEFAULT AREA</small><strong>{profile.default_area}</strong></span>
            </div>
            <div className="profile-security-note"><ShieldCheck aria-hidden="true" /><p>Your phone number is used for sign-in and order updates. Contact support to change it securely.</p></div>
          </aside>

          <section className="profile-editor-card" aria-labelledby="profile-editor-title">
            <div className="profile-editor-heading"><div><span className="eyebrow">ACCOUNT SETTINGS</span><h2 id="profile-editor-title">Your details</h2></div><span className="profile-editor-mark"><Check aria-hidden="true" /></span></div>
            <form className="profile-form" onSubmit={submit}>
              <div className="profile-form-grid">
                <div>
                  <label className="field-label" htmlFor="profile-display-name">Your name</label>
                  <input id="profile-display-name" name="display_name" autoComplete="name" minLength={2} maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
                </div>
                <div>
                  <label className="field-label" htmlFor="profile-default-area">Default delivery area</label>
                  <select id="profile-default-area" name="default_area" value={defaultArea} onChange={(event) => setDefaultArea(event.target.value)} required>
                    {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
              </div>

              <fieldset className="role-picker profile-role-picker">
                <legend className="field-label">How do you use HarvestLink?</legend>
                {roleOptions.map((option) => (
                  <label className={`role-option${role === option.value ? ' is-selected' : ''}`} key={option.value}>
                    <input type="radio" name="profile-role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)} />
                    <span className="role-check"><Check aria-hidden="true" /></span>
                    <span><strong>{option.title}</strong><small>{option.copy}</small></span>
                  </label>
                ))}
              </fieldset>

              {(role === 'farmer' || role === 'both') && (
                <div>
                  <label className="field-label" htmlFor="profile-farm-name">Farm or cooperative name <span className="optional-label">OPTIONAL</span></label>
                  <input id="profile-farm-name" name="farm_name" maxLength={120} value={farmName} onChange={(event) => setFarmName(event.target.value)} placeholder="Your farm name" />
                </div>
              )}

              {formError && <p className="form-error" role="alert">{formError}</p>}
              {saved && <p className="profile-saved-message" role="status"><Check aria-hidden="true" /> Profile and delivery area saved.</p>}
              <div className="profile-form-footer"><span>Your changes are saved to your account.</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}{!busy && <ArrowRight aria-hidden="true" />}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
