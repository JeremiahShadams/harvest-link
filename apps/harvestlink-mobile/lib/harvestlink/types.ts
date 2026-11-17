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
  notes: string | null
  rating: number | null
  rating_note: string | null
  created_at: string
  listing?: Pick<Listing, 'crop' | 'farm_name' | 'image_url' | 'category'> | null
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

export type ShelfLifeResult = {
  crop: string
  remaining_days: number
  confidence: number
  storage_tips: string[]
  disclaimer: string
}

export const LISTING_COLUMNS =
  'id,farmer_id,farmer_name,farm_name,crop,category,price_per_kg,available_kg,harvested_on,estimated_shelf_life_days,scan_confidence,image_url,area,status,is_demo,created_at'

export const ORDER_STATUSES: HarvestOrder['status'][] = [
  'pending',
  'accepted',
  'ready',
  'out_for_delivery',
  'delivered',
]

export const STATUS_LABELS: Record<HarvestOrder['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  ready: 'Ready for pickup',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
}
