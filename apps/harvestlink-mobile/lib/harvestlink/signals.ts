import type { HarvestOrder, Listing, ProduceScan } from './types'

export type SignalWindow = 30 | 90

export type WeeklySales = {
  weekStart: string
  label: string
  value: number
}

export type FarmerSignals = {
  days: SignalWindow
  activeListings: number
  listingsCreated: number
  ordersReceived: number
  ordersDelivered: number
  pendingOrders: number
  completedThisMonth: number
  salesValue: number
  scansCompleted: number
  deliveryRate: number
  consistency: number
  activityScore: number
  weeklySales: WeeklySales[]
  hasHistory: boolean
}

const DAY_MS = 86_400_000
const WEEK_MS = DAY_MS * 7

function startOfWeek(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return date
}

function orderValue(order: HarvestOrder) {
  return Number(order.quantity_kg) * Number(order.unit_price_per_kg)
}

/**
 * One explainable scoring model, used everywhere a farmer's activity is shown.
 *
 * - Listings published:  6 points each, up to 5 listings  = 30
 * - Orders delivered:    6 points each, up to 5 orders    = 30
 * - Freshness scans:     4 points each, up to 5 scans     = 20
 * - Delivery rate:       20% of the rate                  = 20
 *
 * It is supporting evidence, not a credit score.
 */
export function computeActivityScore(input: {
  listingsCreated: number
  ordersDelivered: number
  scansCompleted: number
  deliveryRate: number
}) {
  const listingPoints = Math.min(input.listingsCreated, 5) * 6
  const deliveryPoints = Math.min(input.ordersDelivered, 5) * 6
  const scanPoints = Math.min(input.scansCompleted, 5) * 4
  const ratePoints = Math.max(0, Math.min(100, input.deliveryRate)) * 0.2
  return Math.min(100, Math.round(listingPoints + deliveryPoints + scanPoints + ratePoints))
}

export function computeFarmerSignals({
  userId,
  listings,
  orders,
  scans,
  days,
  now = new Date(),
}: {
  userId: string
  listings: Listing[]
  orders: HarvestOrder[]
  scans: ProduceScan[]
  days: SignalWindow
  now?: Date
}): FarmerSignals {
  const cutoff = now.getTime() - days * DAY_MS
  const inWindow = (value: string) => new Date(value).getTime() >= cutoff

  const farmerListings = listings.filter((listing) => listing.farmer_id === userId)
  const farmerOrders = orders.filter((order) => order.farmer_id === userId)

  const listingsCreated = farmerListings.filter((listing) => inWindow(listing.created_at))
  const ordersReceived = farmerOrders.filter((order) => inWindow(order.created_at))
  const deliveredOrders = ordersReceived.filter((order) => order.status === 'delivered')
  const scansCompleted = scans.filter((scan) => inWindow(scan.created_at)).length

  const salesValue = deliveredOrders.reduce((total, order) => total + orderValue(order), 0)
  const deliveryRate = ordersReceived.length
    ? Math.round((deliveredOrders.length / ordersReceived.length) * 100)
    : 0

  // Consistency: share of the window's weeks that had at least one listing or order.
  const weekCount = Math.max(1, Math.ceil(days / 7))
  const activeWeeks = new Set<string>()
  for (const listing of listingsCreated) activeWeeks.add(startOfWeek(new Date(listing.created_at)).toISOString())
  for (const order of ordersReceived) activeWeeks.add(startOfWeek(new Date(order.created_at)).toISOString())
  const consistency = Math.round((Math.min(activeWeeks.size, weekCount) / weekCount) * 100)

  const activityScore = computeActivityScore({
    listingsCreated: listingsCreated.length,
    ordersDelivered: deliveredOrders.length,
    scansCompleted,
    deliveryRate,
  })

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const completedThisMonth = farmerOrders.filter(
    (order) => order.status === 'delivered' && new Date(order.created_at).getTime() >= monthStart,
  ).length

  const pendingOrders = farmerOrders.filter((order) => order.status === 'pending').length
  const activeListings = farmerListings.filter((listing) => listing.status === 'active').length

  const weeklySales: WeeklySales[] = []
  const thisWeek = startOfWeek(now)
  for (let offset = 7; offset >= 0; offset -= 1) {
    const start = new Date(thisWeek.getTime() - offset * WEEK_MS)
    const end = start.getTime() + WEEK_MS
    const value = farmerOrders
      .filter((order) => order.status === 'delivered')
      .filter((order) => {
        const created = new Date(order.created_at).getTime()
        return created >= start.getTime() && created < end
      })
      .reduce((total, order) => total + orderValue(order), 0)
    weeklySales.push({
      weekStart: start.toISOString(),
      label: new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(start),
      value,
    })
  }

  return {
    days,
    activeListings,
    listingsCreated: listingsCreated.length,
    ordersReceived: ordersReceived.length,
    ordersDelivered: deliveredOrders.length,
    pendingOrders,
    completedThisMonth,
    salesValue,
    scansCompleted,
    deliveryRate,
    consistency,
    activityScore,
    weeklySales,
    hasHistory: farmerListings.length > 0 || farmerOrders.length > 0 || scans.length > 0,
  }
}

/** Turns a single shelf-life estimate into the range shown on listing and order rows. */
export function shelfLifeRange(days: number): { label: string; tone: 'green' | 'gold' | 'red' } {
  const value = Math.max(0, Math.round(days))
  if (value <= 2) return { label: `1–2 days`, tone: 'red' }
  if (value <= 4) return { label: `${value - 1}–${value} days`, tone: 'gold' }
  return { label: `${value - 1}–${value + 1} days`, tone: 'green' }
}
