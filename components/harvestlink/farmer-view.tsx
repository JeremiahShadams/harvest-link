'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, CircleHelp, ClipboardCheck, Copy, Eye, Leaf, Plus, ScanLine, ShieldCheck, Sprout, Tractor, X } from 'lucide-react'
import type { HarvestOrder, Listing, Profile, ProduceScan, ShelfLifeResult } from '@/lib/harvestlink/types'
import { formatNaira, formatQuantity, PRODUCT_IMAGES } from '@/lib/harvestlink/types'

type ListingInput = {
  crop: string
  category: string
  price: number
  quantity: number
  shelfDays: number
  farmName: string
  area: string
}

type FarmerViewProps = {
  profile: Profile | null
  listings: Listing[]
  orders: HarvestOrder[]
  scans: ProduceScan[]
  loading: boolean
  signedIn: boolean
  latestScan: ShelfLifeResult | null
  reportUrl: string
  reportBusy: boolean
  onSignIn: () => void
  onOpenScan: () => void
  onCreateListing: (input: ListingInput) => Promise<string | null>
  onCreateReport: () => void
  onCopyReport: () => void
  onModeChange: (mode: 'buyer' | 'farmer') => void
}

export function FarmerView(props: FarmerViewProps) {
  const { profile, listings, orders, scans, loading, signedIn, latestScan, reportUrl, reportBusy, onSignIn, onOpenScan, onCreateListing, onCreateReport, onCopyReport, onModeChange } = props
  const [listingOpen, setListingOpen] = useState(false)
  const [crop, setCrop] = useState('Vine tomatoes')
  const [category, setCategory] = useState('Tomatoes')
  const [price, setPrice] = useState('3200')
  const [quantity, setQuantity] = useState('18')
  const [shelfDays, setShelfDays] = useState('7')
  const [farmName, setFarmName] = useState(profile?.farm_name ?? '')
  const [area, setArea] = useState(profile?.default_area === 'Lekki' ? 'Epe' : profile?.default_area ?? 'Epe')
  const [formError, setFormError] = useState('')
  const [formBusy, setFormBusy] = useState(false)

  useEffect(() => {
    if (latestScan) {
      setCrop(latestScan.crop)
      setShelfDays(String(latestScan.remaining_days))
    }
  }, [latestScan])

  const activeListings = listings.filter((listing) => listing.status === 'active')
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  const deliveredOrders = orders.filter((order) => order.status === 'delivered' && new Date(order.created_at).getTime() >= cutoff)
  const recentOrders = orders.slice(0, 3)
  const revenue = deliveredOrders.reduce((sum, order) => sum + Number(order.quantity_kg) * Number(order.unit_price_per_kg), 0)
  const recentListings = listings.filter((listing) => new Date(listing.created_at).getTime() >= cutoff).length
  const recentScans = scans.filter((scan) => new Date(scan.created_at).getTime() >= cutoff).length
  const score = Math.min(100, recentListings * 8 + deliveredOrders.length * 12 + recentScans * 5)
  const hasFarmerRole = profile?.role === 'farmer' || profile?.role === 'both'

  const saveListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const listingInput = { crop: crop.trim(), category, price: Number(price), quantity: Number(quantity), shelfDays: Number(shelfDays), farmName: farmName.trim(), area } satisfies ListingInput
    if (listingInput.crop.length < 2 || !Number.isFinite(listingInput.price) || listingInput.price <= 0 || !Number.isFinite(listingInput.quantity) || listingInput.quantity <= 0 || listingInput.shelfDays < 1 || listingInput.shelfDays > 60) {
      setFormError('Add a crop, a price, a quantity, and a shelf-life estimate to continue.')
      return
    }
    setFormBusy(true)
    const error = await onCreateListing(listingInput)
    setFormBusy(false)
    if (error) {
      setFormError(error)
      return
    }
    setListingOpen(false)
  }

  return (
    <div className="page-stack farmer-page">
      <section className="farmer-welcome">
        <div className="farmer-welcome-copy"><span className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> HARVESTLINK FARMER STUDIO</span><h1>Your farm has<br /><em>a story to tell.</em></h1><p>Build a clear record of the care, consistency, and deliveries behind every harvest.</p><div className="farmer-welcome-actions"><button className="button button-light" onClick={() => signedIn ? setListingOpen(true) : onSignIn()}><Plus aria-hidden="true" /> Add a harvest</button><button className="farmer-text-link" onClick={() => onModeChange('buyer')}>Explore as a buyer <ArrowUpRight aria-hidden="true" /></button></div></div>
        <div className="farmer-welcome-art" aria-hidden="true"><span className="farmer-orbit farmer-orbit--one" /><span className="farmer-orbit farmer-orbit--two" /><span className="farmer-sun" /><div className="farmer-art-leaf farmer-art-leaf--one"><Leaf /></div><div className="farmer-art-leaf farmer-art-leaf--two"><Leaf /></div><div className="farmer-art-seal"><Sprout /><span>GROWN<br />WITH CARE</span></div><div className="farmer-art-stem" /></div>
      </section>

      {!signedIn && <div className="sample-notice farmer-signin-notice"><span className="sample-dot" /><span><strong>Your farm, your story.</strong> Sign in with your phone to publish harvests and build your private activity record.</span><button className="text-button" onClick={onSignIn}>Get started <ArrowRight aria-hidden="true" /></button></div>}
      {signedIn && !hasFarmerRole && <div className="sample-notice farmer-signin-notice"><span className="sample-dot" /><span><strong>Ready to grow with us?</strong> Set up a farmer profile before adding your first harvest.</span><button className="text-button" onClick={() => onModeChange('farmer')}>Set up profile <ArrowRight aria-hidden="true" /></button></div>}

      <section className="farmer-stats-grid" aria-label="Farmer activity summary">
        <StatCard label="Active harvests" value={signedIn && hasFarmerRole ? String(activeListings.length) : '—'} detail="Listed and ready" icon={<Sprout aria-hidden="true" />} tone="green" loading={loading} />
        <StatCard label="Deliveries completed" value={signedIn && hasFarmerRole ? String(deliveredOrders.length) : '—'} detail="Last 90 days" icon={<ClipboardCheck aria-hidden="true" />} tone="gold" loading={loading} />
        <StatCard label="Sales from delivered orders" value={signedIn && hasFarmerRole ? formatNaira(revenue) : '—'} detail="Based on recorded orders" icon={<ArrowUpRight aria-hidden="true" />} tone="lavender" loading={loading} />
        <StatCard label="Produce scans" value={signedIn && hasFarmerRole ? String(recentScans) : '—'} detail="Freshness notes saved" icon={<ScanLine aria-hidden="true" />} tone="peach" loading={loading} />
      </section>

      <section className="farmer-content-grid">
        <div className="farmer-main-column">
          <article className="activity-card">
            <div className="activity-card-heading"><div><span className="eyebrow">A 90-DAY SNAPSHOT</span><h2>Consistency, made visible.</h2><p>A simple activity signal—not a credit decision.</p></div><span className="score-sprout"><Sprout aria-hidden="true" /></span></div>
            <div className="consistency-row"><div className="score-circle" style={{ '--score': `${score}%` } as React.CSSProperties}><span><strong>{signedIn && hasFarmerRole ? score : '—'}</strong><small>out of 100</small></span></div><div className="consistency-copy"><span className="score-label">Your activity signal</span><h3>{score >= 70 ? 'Growing steadily' : score >= 30 ? 'Building a good rhythm' : 'Every first step counts'}</h3><p>Marketplace listings, delivered orders, and freshness scans contribute to this transparent activity snapshot.</p></div></div>
            <div className="activity-signal-legend"><span><i className="legend-dot legend-dot--green" /> Listings</span><span><i className="legend-dot legend-dot--gold" /> Deliveries</span><span><i className="legend-dot legend-dot--lilac" /> Scans</span><span className="signal-scale"><ArrowDownRight aria-hidden="true" /> activity builds over time</span></div>
          </article>

          <article className="farmer-listings-card">
            <div className="content-card-heading"><div><span className="eyebrow">THE CURRENT HARVEST</span><h2>Your listings</h2></div><button className="text-button" onClick={() => signedIn ? setListingOpen(true) : onSignIn()}>Add a harvest <Plus aria-hidden="true" /></button></div>
            {!signedIn || !hasFarmerRole ? <div className="farmer-empty-row"><span className="empty-icon"><Tractor aria-hidden="true" /></span><div><strong>Your next harvest starts here.</strong><p>Set up a farmer profile to add your first crop.</p></div></div> : activeListings.length === 0 ? <div className="farmer-empty-row"><span className="empty-icon"><Tractor aria-hidden="true" /></span><div><strong>Nothing listed just yet.</strong><p>When your next harvest is ready, add it here for nearby buyers.</p></div></div> : (
              <div className="farmer-listings-list">{activeListings.slice(0, 4).map((listing) => <div className="farmer-listing-row" key={listing.id}><img src={listing.image_url || PRODUCT_IMAGES[listing.category] || PRODUCT_IMAGES.Other} alt="" /><div><strong>{listing.crop}</strong><span>{listing.area} · {formatQuantity(listing.available_kg)} kg available</span></div><div className="farmer-listing-price"><strong>{formatNaira(listing.price_per_kg)}</strong><span>/ kg</span></div><span className="listing-status"><i /> Active</span></div>)}</div>
            )}
          </article>
        </div>

        <aside className="farmer-side-column">
          <article className="farm-identity-card"><span className="farm-avatar"><Sprout aria-hidden="true" /></span><span className="eyebrow">YOUR FARM PROFILE</span><h2>{profile?.farm_name || (hasFarmerRole ? 'Independent farm' : 'Your farm profile')}</h2><p>{profile?.display_name || 'Add your name and tell buyers who grows their food.'}</p><div className="farm-location"><BadgeCheck aria-hidden="true" />{profile?.default_area || 'Lagos'} area</div><div className="profile-progress"><div><span>Profile basics</span><strong>{hasFarmerRole ? profile?.farm_name ? 'Complete' : 'In progress' : 'Get started'}</strong></div><div className="progress-track"><span style={{ width: hasFarmerRole && profile?.farm_name ? '100%' : hasFarmerRole ? '65%' : '12%' }} /></div></div></article>

          <article className="report-card"><div className="report-card-icon"><ShieldCheck aria-hidden="true" /></div><span className="eyebrow">A RECORD THAT TRAVELS</span><h2>Your activity, in one link.</h2><p>Share a time-limited summary of your marketplace activity with a cooperative, buyer, or finance partner.</p>{reportUrl ? <div className="report-link-box"><span>{reportUrl}</span><button onClick={onCopyReport} aria-label="Copy activity report link"><Copy aria-hidden="true" /></button></div> : <button className="button button-outline button-wide" onClick={() => signedIn && hasFarmerRole ? onCreateReport() : signedIn ? onModeChange('farmer') : onSignIn()} disabled={reportBusy}>{reportBusy ? 'Preparing your report…' : <>Create shareable report <ArrowRight aria-hidden="true" /></>}</button>}<div className="report-note"><CircleHelp aria-hidden="true" /><span>Private by default · Expires in 30 days · Revoke anytime</span></div></article>

          <article className="farmer-privacy-note"><Eye aria-hidden="true" /><p>Your activity is yours. Shared reports show a limited summary, never order notes or buyer details.</p></article>
        </aside>
      </section>

      <section className="recent-orders-card"><div className="content-card-heading"><div><span className="eyebrow">FROM FIELD TO FRONT DOOR</span><h2>Recent order activity</h2></div><span className="recent-orders-window">LAST 90 DAYS</span></div>{recentOrders.length ? <div className="recent-order-items">{recentOrders.map((order) => <div key={order.id}><span className={`recent-order-dot recent-order-dot--${order.status}`} /><span><strong>{order.listing?.crop ?? 'Farm-fresh produce'}</strong><small>{new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date(order.created_at))} · {formatQuantity(order.quantity_kg)} kg</small></span><span className="status-pill status-pill--compact">{order.status.replaceAll('_', ' ')}</span><span className="recent-order-value">{formatNaira(Number(order.quantity_kg) * Number(order.unit_price_per_kg))}</span></div>)}</div> : <p className="recent-orders-empty">New orders appear here as your farm and its neighbors begin to trade.</p>}</section>

      {listingOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setListingOpen(false)}><section className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-title"><button className="modal-close" onClick={() => setListingOpen(false)} aria-label="Close listing form"><X aria-hidden="true" /></button><span className="eyebrow">READY FOR MARKET</span><h2 id="listing-title">Add a harvest.</h2><p className="modal-intro">A few clear details help buyers choose with confidence.</p><form className="listing-form" onSubmit={saveListing}>
        <label className="field-label" htmlFor="listing-crop">What are you growing?</label><input id="listing-crop" value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="e.g. Vine tomatoes" maxLength={80} required />
        <label className="field-label" htmlFor="listing-category">Produce category</label><div className="select-wrap"><select id="listing-category" value={category} onChange={(event) => setCategory(event.target.value)}><option>Tomatoes</option><option>Leafy greens</option><option>Peppers</option><option>Fruits</option><option>Other</option></select><ArrowDownRight aria-hidden="true" /></div>
        <div className="form-columns"><div><label className="field-label" htmlFor="listing-price">Price per kg (₦)</label><input id="listing-price" type="number" min="1" step="50" value={price} onChange={(event) => setPrice(event.target.value)} required /></div><div><label className="field-label" htmlFor="listing-quantity">Available (kg)</label><input id="listing-quantity" type="number" min="0.5" step="0.5" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div></div>
        <div className="form-columns"><div><label className="field-label" htmlFor="listing-shelf">Shelf life (days)</label><input id="listing-shelf" type="number" min="1" max="60" value={shelfDays} onChange={(event) => setShelfDays(event.target.value)} required /></div><div><label className="field-label" htmlFor="listing-area">Farm area</label><select id="listing-area" value={area} onChange={(event) => setArea(event.target.value)}><option>Epe</option><option>Ikorodu</option><option>Badagry</option><option>Agege</option><option>Lagos</option></select></div></div>
        <label className="field-label" htmlFor="listing-farm">Farm name</label><input id="listing-farm" value={farmName} onChange={(event) => setFarmName(event.target.value)} placeholder="Your farm or cooperative" maxLength={100} />
        {latestScan && <p className="scan-applied-note"><ScanLine aria-hidden="true" /> Last scan: {latestScan.remaining_days} days estimated · {Math.round(latestScan.confidence * 100)}% visual confidence</p>}
        <button className="scan-from-listing" type="button" onClick={onOpenScan}><ScanLine aria-hidden="true" /> Scan this produce for a shelf-life estimate <ArrowRight aria-hidden="true" /></button>
        <p className="listing-guidance"><CircleHelp aria-hidden="true" /> Shelf life is your estimate. A photo scan is a visual guide, not a food-safety test.</p>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="button button-primary button-wide" type="submit" disabled={formBusy}>{formBusy ? 'Publishing…' : 'Publish harvest'} <ArrowRight aria-hidden="true" /></button>
      </form></section></div>}
    </div>
  )
}

function StatCard({ label, value, detail, icon, tone, loading }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string; loading: boolean }) {
  return <article className="farmer-stat-card"><span className={`stat-icon stat-icon--${tone}`}>{icon}</span><span className="stat-label">{label}</span><strong className={loading ? 'stat-value is-loading' : 'stat-value'}>{loading ? '···' : value}</strong><span className="stat-detail">{detail}</span><span className="stat-trend"><ArrowUpRight aria-hidden="true" /> activity</span></article>
}
