export type AppSection = 'shop' | 'orders' | 'scan' | 'farmer' | 'notifications' | 'profile'

export type HarvestNotification = {
  id: string
  user_id: string
  kind: 'order_placed' | 'order_status' | 'short_shelf_life'
  title: string
  message: string
  order_id: string | null
  listing_id: string | null
  created_at: string
  read_at: string | null
}

export type HarvestRole = 'buyer' | 'farmer' | 'both'

export type Profile = {
  id: string
  display_name: string
  phone: string | null
  role: HarvestRole
  default_area: string
  farm_name: string | null
}

export type Listing = {
  id: string
  farmer_id: string | null
  farmer_name: string
  farm_name: string
  crop: string
  category: string
  price_per_kg: number | string
  available_kg: number | string
  harvested_on: string
  estimated_shelf_life_days: number
  scan_confidence: number | string | null
  image_url: string
  area: string
  status: 'active' | 'sold' | 'hidden'
  is_demo: boolean
  created_at: string
}

export type HarvestOrder = {
  id: string
  listing_id: string
  buyer_id: string
  farmer_id: string
  quantity_kg: number | string
  unit_price_per_kg: number | string
  status: 'pending' | 'accepted' | 'ready' | 'out_for_delivery' | 'delivered'
  delivery_window: string
  delivery_area: string
  notes: string
  rating: number | null
  rating_note: string
  created_at: string
  listing?: Pick<Listing, 'crop' | 'farm_name' | 'image_url'> | null
}

export type ProduceScan = {
  id: string
  user_id: string
  crop: string
  remaining_days: number
  confidence: number
  storage_tips: string[]
  created_at: string
}

export type ShelfLifeResult = {
  crop: string
  remaining_days: number
  confidence: number
  storage_tips: string[]
  disclaimer: string
}

export const LISTING_COLUMNS = 'id,farmer_id,farmer_name,farm_name,crop,category,price_per_kg,available_kg,harvested_on,estimated_shelf_life_days,scan_confidence,image_url,area,status,is_demo,created_at'

export const PRODUCT_IMAGES: Record<string, string> = {
  Tomatoes: '/images/tomatoes.png',
  'Leafy greens': '/images/greens.png',
  Peppers: '/images/peppers.png',
  Fruits: '/images/plantain.png',
  Other: '/images/greens.png',
}

export function formatNaira(amount: number | string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function formatQuantity(amount: number | string) {
  return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 1 }).format(Number(amount) || 0)
}

export function relativeHarvestDate(date: string) {
  const harvested = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const difference = Math.round((today.getTime() - harvested.getTime()) / 86_400_000)
  if (difference <= 0) return 'Harvested today'
  if (difference === 1) return 'Harvested yesterday'
  return `Harvested ${difference} days ago`
}

export function normalizeNigerianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`
  if (digits.startsWith('234')) return `+${digits}`
  return `+${digits}`
}
