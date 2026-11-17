'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Clock3, Package, PackageCheck, Star, Truck } from 'lucide-react'
import type { HarvestOrder } from '@/lib/harvestlink/types'
import { formatNaira, formatQuantity } from '@/lib/harvestlink/types'

type OrdersViewProps = {
  orders: HarvestOrder[]
  loading: boolean
  mode: 'buyer' | 'farmer'
  onAdvance: (order: HarvestOrder, nextStatus: HarvestOrder['status']) => void
  onRate: (order: HarvestOrder, rating: number, note: string) => Promise<string | null>
  onBrowse: () => void
  signedIn: boolean
  onSignIn: () => void
}

const statusLabels: Record<HarvestOrder['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  ready: 'Ready for pickup',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
}

const statusSteps: HarvestOrder['status'][] = ['pending', 'accepted', 'ready', 'out_for_delivery', 'delivered']
const nextStatus: Partial<Record<HarvestOrder['status'], HarvestOrder['status']>> = {
  pending: 'accepted',
  accepted: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
}

export function OrdersView({ orders, loading, mode, onAdvance, onRate, onBrowse, signedIn, onSignIn }: OrdersViewProps) {
  const visibleOrders = orders.filter((order) => mode === 'buyer' ? order.buyer_id : order.farmer_id)

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div><span className="eyebrow">GOOD THINGS ARE ON THEIR WAY</span><h1>{mode === 'buyer' ? 'Your orders' : 'Orders for your farm'}</h1><p>{mode === 'buyer' ? 'Follow every basket from farm to front door.' : 'Keep every harvest moving, one clear step at a time.'}</p></div>
        {!signedIn && <button className="button button-primary" onClick={onSignIn}>Sign in <ArrowRight aria-hidden="true" /></button>}
      </section>
      <section className="order-summary-strip" aria-label="Order summary">
        <div><span className="summary-icon"><Package aria-hidden="true" /></span><span><strong>{visibleOrders.length}</strong><small>{mode === 'buyer' ? 'total orders' : 'orders received'}</small></span></div>
        <div><span className="summary-icon summary-icon--gold"><Clock3 aria-hidden="true" /></span><span><strong>{visibleOrders.filter((order) => order.status !== 'delivered').length}</strong><small>in progress</small></span></div>
        <div><span className="summary-icon summary-icon--green"><PackageCheck aria-hidden="true" /></span><span><strong>{visibleOrders.filter((order) => order.status === 'delivered').length}</strong><small>delivered</small></span></div>
      </section>

      {loading ? <div className="orders-loading" aria-label="Loading orders"><span /><span /><span /></div> : visibleOrders.length > 0 ? (
        <section className="orders-list" aria-label="Order history">
          {visibleOrders.map((order) => <OrderCard key={order.id} order={order} mode={mode} onAdvance={onAdvance} onRate={onRate} />)}
        </section>
      ) : (
        <section className="empty-state empty-state--large">
          <span className="empty-icon"><PackageCheck aria-hidden="true" /></span>
          <span className="eyebrow">A CLEAN SLATE</span>
          <h2>{signedIn ? 'Your next good thing starts here.' : 'Your orders will find a home here.'}</h2>
          <p>{mode === 'buyer' ? 'When you order from a nearby farm, every step will show up right here.' : 'When a buyer chooses your harvest, the order and next steps will be waiting here.'}</p>
          {mode === 'buyer' && <button className="button button-primary" onClick={onBrowse}>Browse the harvest <ArrowRight aria-hidden="true" /></button>}
          {!signedIn && <button className="button button-outline" onClick={onSignIn}>Continue with phone <ArrowRight aria-hidden="true" /></button>}
        </section>
      )}
    </div>
  )
}

function OrderCard({ order, mode, onAdvance, onRate }: { order: HarvestOrder; mode: 'buyer' | 'farmer'; onAdvance: OrdersViewProps['onAdvance']; onRate: OrdersViewProps['onRate'] }) {
  const stepIndex = statusSteps.indexOf(order.status)
  const transition = nextStatus[order.status]
  const crop = order.listing?.crop ?? 'Farm-fresh produce'
  const image = order.listing?.image_url ?? '/images/tomatoes.png'
  const farm = order.listing?.farm_name ?? 'Local farm'
  const created = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date(order.created_at))

  return (
    <article className="order-card">
      <div className="order-card-head"><div className="order-reference"><span>ORDER</span><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><span className="order-date">Placed {created}</span></div><span className={`status-pill status-${order.status}`}>{statusLabels[order.status]}</span></div>
      <div className="order-card-product"><img src={image} alt="" /><div><strong>{crop}</strong><span>{farm} · {formatQuantity(order.quantity_kg)} kg</span><span>{order.delivery_area} · {order.delivery_window}</span></div><strong className="order-total">{formatNaira(Number(order.quantity_kg) * Number(order.unit_price_per_kg))}</strong></div>
      <div className="order-progress" aria-label={`Order status: ${statusLabels[order.status]}`}>
        {statusSteps.map((step, index) => <div className={`progress-step${index <= stepIndex ? ' is-complete' : ''}${index === stepIndex ? ' is-current' : ''}`} key={step}><span className="progress-dot">{index < stepIndex ? <Check aria-hidden="true" /> : index === 3 ? <Truck aria-hidden="true" /> : null}</span><small>{step === 'out_for_delivery' ? 'On the way' : statusLabels[step]}</small></div>)}
      </div>
      {order.status === 'delivered' && order.rating !== null && <div className="order-rating-summary">
        <div className="order-rating-summary-head"><span>{mode === 'farmer' ? 'Buyer rating' : 'Your rating'}</span><span className="rating-stars" aria-label={`${order.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < order.rating! ? 'currentColor' : 'none'} aria-hidden="true" />)}</span></div>
        {order.rating_note && <p className="order-rating-note">{order.rating_note}</p>}
      </div>}
      {mode === 'buyer' && order.status === 'delivered' && order.rating === null && <RatingForm order={order} onRate={onRate} />}
      {mode === 'farmer' && transition && <button className="advance-order-button" onClick={() => onAdvance(order, transition)}>Mark as {statusLabels[transition].toLowerCase()} <ArrowRight aria-hidden="true" /></button>}
      {mode === 'buyer' && order.status !== 'delivered' && <p className="order-help-text"><Clock3 aria-hidden="true" /> Your farmer will update this order as it is prepared.</p>}
    </article>
  )
}

function RatingForm({ order, onRate }: { order: HarvestOrder; onRate: OrdersViewProps['onRate'] }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (rating < 1 || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await onRate(order, rating, note.trim())
      if (result) setError(result)
      else setOpen(false)
    } catch {
      setError('We couldn’t save your rating. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <button className="rate-order-button" type="button" onClick={() => setOpen(true)}>Rate this delivery <Star aria-hidden="true" /></button>

  return <form className="order-rating-form" onSubmit={submit}>
    <div className="order-rating-form-heading"><h3>How was your order?</h3><p>Your feedback helps build trust between nearby farms and buyers.</p></div>
    <div className="rating-choice-row" role="group" aria-label="Choose a rating from one to five stars">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1
        return <button key={value} type="button" aria-label={`Rate ${value} out of 5 stars`} aria-pressed={rating === value} onClick={() => setRating(value)}><Star fill={value <= rating ? 'currentColor' : 'none'} aria-hidden="true" /></button>
      })}
    </div>
    <label className="rating-note-label" htmlFor={`rating-note-${order.id}`}>A note <span>Optional</span><textarea className="rating-note-input" id={`rating-note-${order.id}`} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Share a quick thought about this order" /></label>
    {error && <p className="rating-form-error" role="alert">{error}</p>}
    <div className="rating-form-actions"><button type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button type="submit" disabled={busy || rating < 1}>{busy ? 'Saving…' : 'Send rating'} <ArrowRight aria-hidden="true" /></button></div>
  </form>
}
