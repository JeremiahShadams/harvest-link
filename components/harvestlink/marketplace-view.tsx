'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Check, ChevronDown, Clock3, MapPin, PackageCheck, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import type { Listing } from '@/lib/harvestlink/types'
import { formatNaira, formatQuantity, relativeHarvestDate } from '@/lib/harvestlink/types'

type MarketplaceViewProps = {
  listings: Listing[]
  loading: boolean
  error: boolean
  search: string
  onSearch: (value: string) => void
  category: string
  onCategory: (value: string) => void
  deliveryArea: string
  onSelectListing: (listing: Listing) => void
}

const categories = ['All produce', 'Tomatoes', 'Leafy greens', 'Peppers', 'Fruits']

export function MarketplaceView({ listings, loading, error, search, onSearch, category, onCategory, deliveryArea, onSelectListing }: MarketplaceViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [farmArea, setFarmArea] = useState('All areas')
  const [minimumShelfLife, setMinimumShelfLife] = useState('0')
  const [maximumPrice, setMaximumPrice] = useState('')
  const activeFilterCount = Number(farmArea !== 'All areas') + Number(minimumShelfLife !== '0') + Number(maximumPrice !== '')
  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase()
    return listings.filter((listing) => {
      const matchesCategory = category === 'All produce' || listing.category === category
      const matchesSearch = !term || [listing.crop, listing.farm_name, listing.farmer_name, listing.area].some((value) => value.toLowerCase().includes(term))
      const matchesFarmArea = farmArea === 'All areas' || listing.area === farmArea
      const matchesShelfLife = listing.estimated_shelf_life_days >= Number(minimumShelfLife)
      const matchesPrice = maximumPrice === '' || Number(listing.price_per_kg) <= Number(maximumPrice)
      return matchesCategory && matchesSearch && matchesFarmArea && matchesShelfLife && matchesPrice
    })
  }, [category, farmArea, listings, maximumPrice, minimumShelfLife, search])

  return (
    <div className="page-stack">
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> GOOD FOOD, A LITTLE CLOSER</span>
          <h1>Fresh finds.<br /><em>Familiar places.</em></h1>
          <p>Meet the people who grow your food, and bring the best of Lagos&apos; nearby harvests to your table.</p>
          <div className="welcome-meta"><span><MapPin aria-hidden="true" /> Delivering around {deliveryArea}</span><span className="meta-divider" /><span>Ikorodu · Epe · Lagos</span></div>
        </div>
        <div className="welcome-photo" aria-hidden="true">
          <img src="/images/harvest-hero.png" alt="" />
          <div className="photo-caption"><span className="caption-sparkle"><Sparkles aria-hidden="true" /></span><span><strong>Grown nearby</strong><small>Picked with care, shared with you.</small></span></div>
        </div>
        <div className="welcome-sun" aria-hidden="true" />
      </section>

      <section className="market-intro" aria-labelledby="market-title">
        <div>
          <span className="eyebrow">THE MORNING HARVEST</span>
          <h2 id="market-title">Good things, in season.</h2>
          <p>Know the farm. Know the freshness. Choose what feels right.</p>
        </div>
        <div className="market-assurance"><ShieldCheck aria-hidden="true" /><span>Clear harvest dates<br />and shelf-life guidance</span></div>
      </section>

      <div className="shop-tools">
        <label className="search-box">
          <Search aria-hidden="true" />
          <span className="sr-only">Search produce or farms</span>
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Try tomatoes, spinach, or a farm name" />
          {search && <button onClick={() => onSearch('')} aria-label="Clear search"><X aria-hidden="true" /></button>}
        </label>
        <div className="category-list" aria-label="Filter by produce category">
          {categories.map((item) => (
            <button key={item} className={`category-chip${category === item ? ' is-active' : ''}`} onClick={() => onCategory(item)} aria-pressed={category === item}>{item}</button>
          ))}
        </div>
        <div className="advanced-filter-wrap">
          <button className={`filter-toggle${activeFilterCount ? ' has-filters' : ''}`} type="button" aria-expanded={filtersOpen} aria-controls="advanced-market-filters" onClick={() => setFiltersOpen((open) => !open)}>
            <SlidersHorizontal aria-hidden="true" /> More filters {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>} <ChevronDown className={filtersOpen ? 'is-open' : ''} aria-hidden="true" />
          </button>
          {filtersOpen && <div className="advanced-filter-panel" id="advanced-market-filters">
            <label><span>Farm area</span><select value={farmArea} onChange={(event) => setFarmArea(event.target.value)}><option>All areas</option><option>Epe</option><option>Ikorodu</option><option>Badagry</option><option>Agege</option><option>Lagos</option></select></label>
            <label><span>At least this fresh</span><select value={minimumShelfLife} onChange={(event) => setMinimumShelfLife(event.target.value)}><option value="0">Any shelf life</option><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label>
            <label><span>Max price per kg</span><input type="number" min="0" step="100" inputMode="numeric" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="No limit" /></label>
            {activeFilterCount > 0 && <button className="clear-filters" type="button" onClick={() => { setFarmArea('All areas'); setMinimumShelfLife('0'); setMaximumPrice('') }}>Clear filters</button>}
          </div>}
        </div>
      </div>

      <div className="sample-notice"><span className="sample-dot" /><span><strong>Preview market</strong> · Example listings help you explore. Sample stock can&apos;t be ordered.</span></div>

      <section className="produce-grid" aria-label="Available produce">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="product-skeleton" aria-hidden="true" />)
        ) : error ? (
          <div className="empty-state"><span className="empty-icon"><PackageCheck aria-hidden="true" /></span><h3>The market is taking a breath.</h3><p>We couldn&apos;t load produce just now. Give it another moment.</p></div>
        ) : filteredListings.length > 0 ? (
          filteredListings.map((listing, index) => <ProductCard key={listing.id} listing={listing} priority={index < 2} onSelect={() => onSelectListing(listing)} />)
        ) : (
          <div className="empty-state"><span className="empty-icon"><Search aria-hidden="true" /></span><h3>No harvests in this basket.</h3><p>Try another search or come back when the next picking is ready.</p><button className="text-button" onClick={() => { onSearch(''); onCategory('All produce') }}>See all produce <ArrowRight aria-hidden="true" /></button></div>
        )}
      </section>

      <section className="market-footer-note"><span className="footer-note-mark"><LeafMark /></span><p>Every order starts a conversation between the people who grow food and the people who enjoy it.</p></section>
    </div>
  )
}

function ProductCard({ listing, priority, onSelect }: { listing: Listing; priority: boolean; onSelect: () => void }) {
  return (
    <article className="product-card">
      <button className="product-image" onClick={onSelect} aria-label={`View ${listing.crop} from ${listing.farm_name}`}>
        <img src={listing.image_url || '/images/greens.png'} alt={`${listing.crop} freshly harvested at ${listing.farm_name}`} loading={priority ? 'eager' : 'lazy'} />
        <span className="fresh-badge"><Clock3 aria-hidden="true" /> {listing.estimated_shelf_life_days} days fresh*</span>
        <span className="product-image-arrow"><ArrowRight aria-hidden="true" /></span>
      </button>
      <div className="product-card-body">
        <div className="product-card-topline"><span className="product-category">{listing.category}</span><span className="product-origin"><MapPin aria-hidden="true" /> {listing.area}</span></div>
        <button className="product-title-button" onClick={onSelect}><h3>{listing.crop}</h3></button>
        <p className="farm-line">By {listing.farmer_name} <span>·</span> {listing.farm_name}</p>
        <div className="product-card-bottom"><div><strong>{formatNaira(listing.price_per_kg)}</strong><span>/ kg</span><small>{relativeHarvestDate(listing.harvested_on)}</small></div><button className="product-arrow-button" onClick={onSelect} aria-label={`See ${listing.crop}`}><ArrowRight aria-hidden="true" /></button></div>
        {listing.is_demo && <span className="demo-listing-label"><span /> Sample listing</span>}
      </div>
      <span className="sr-only">*Visual shelf-life estimate, not a food-safety assessment.</span>
    </article>
  )
}

function LeafMark() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" fill="none"><path d="M23 5C12 5 6 9 6 17c0 3.2 2.2 5.5 5.3 5.5C19 22.5 23 14 23 5Z" stroke="currentColor" strokeWidth="1.6"/><path d="M4.5 24c3.2-5.6 7.2-9.5 13-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
}

type OrderDialogProps = {
  listing: Listing | null
  onClose: () => void
  onOrder: (listing: Listing, quantity: number, window: string, notes: string) => Promise<string | null>
  requireAuth: () => void
  signedIn: boolean
}

export function OrderDialog({ listing, onClose, onOrder, requireAuth, signedIn }: OrderDialogProps) {
  const [quantity, setQuantity] = useState(1)
  const [window, setWindow] = useState('Tomorrow · 9am–12pm')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!listing) return null

  const total = Number(listing.price_per_kg) * quantity
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!signedIn) {
      requireAuth()
      return
    }
    if (listing.is_demo) return
    setBusy(true)
    setError('')
    const result = await onOrder(listing, quantity, window, notes)
    setBusy(false)
    if (result) setError(result)
    else onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
        <button className="modal-close" onClick={onClose} aria-label="Close order details"><X aria-hidden="true" /></button>
        <div className="order-modal-image"><img src={listing.image_url || '/images/greens.png'} alt={`${listing.crop} from ${listing.farm_name}`} /></div>
        <div className="order-modal-content">
          <span className="eyebrow">{listing.area} · {listing.category}</span>
          <h2 id="order-title">{listing.crop}</h2>
          <p className="farm-line">Grown by {listing.farmer_name} at {listing.farm_name}</p>
          <div className="order-freshness"><span><Clock3 aria-hidden="true" /> {listing.estimated_shelf_life_days} days estimated</span><span><Check aria-hidden="true" /> {relativeHarvestDate(listing.harvested_on)}</span></div>
          <div className="order-modal-price"><strong>{formatNaira(listing.price_per_kg)}</strong><span>per kg</span><span className="order-stock">{formatQuantity(listing.available_kg)} kg available</span></div>
          {listing.is_demo ? (
            <div className="demo-order-note"><span className="sample-dot" /><div><strong>Preview listing</strong><p>This is sample inventory for exploring HarvestLink. It isn&apos;t available to order.</p></div></div>
          ) : (
            <form className="order-form" onSubmit={submit}>
              <label className="field-label" htmlFor="order-quantity">How much would you like?</label>
              <div className="quantity-field"><input id="order-quantity" type="number" min="0.5" max={listing.available_kg} step="0.5" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /><span>kg</span><strong>{formatNaira(total)}</strong></div>
              <label className="field-label" htmlFor="delivery-window">Preferred delivery window</label>
              <div className="select-wrap"><select id="delivery-window" value={window} onChange={(event) => setWindow(event.target.value)}><option>Tomorrow · 9am–12pm</option><option>Tomorrow · 12pm–3pm</option><option>Tomorrow · 3pm–6pm</option><option>Next available harvest</option></select><ChevronDown aria-hidden="true" /></div>
              <label className="field-label" htmlFor="order-notes">Anything the farmer should know? <span className="optional-label">Optional</span></label>
              <textarea id="order-notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A delivery note or a quick question" />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary button-wide" type="submit" disabled={busy || quantity <= 0 || quantity > Number(listing.available_kg)}>{busy ? 'Placing your order…' : 'Place order'} <ArrowRight aria-hidden="true" /></button>
            </form>
          )}
          {listing.is_demo && <button className="button button-outline button-wide" onClick={onClose}>Back to the market</button>}
          {!listing.is_demo && !signedIn && <button className="button button-primary button-wide" onClick={requireAuth}>Sign in to order <ArrowRight aria-hidden="true" /></button>}
          <p className="order-footnote">A farmer will confirm your order before it&apos;s prepared.</p>
        </div>
      </section>
    </div>
  )
}
