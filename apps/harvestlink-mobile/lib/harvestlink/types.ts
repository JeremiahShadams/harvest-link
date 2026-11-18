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

export const PROFILE_COLUMNS = 'id,display_name,phone,role,default_area,farm_name'

export const LISTING_COLUMNS =
  'id,farmer_id,farmer_name,farm_name,crop,category,price_per_kg,available_kg,harvested_on,estimated_shelf_life_days,scan_confidence,image_url,area,status,is_demo,created_at'

export const LISTING_SUMMARY_COLUMNS = 'id,crop,farm_name,image_url,category'

export const ORDER_COLUMNS =
  'id,listing_id,buyer_id,farmer_id,quantity_kg,unit_price_per_kg,status,delivery_window,delivery_area,notes,rating,rating_note,created_at'

export const SCAN_COLUMNS = 'id,user_id,crop,remaining_days,confidence,storage_tips,created_at'

export const NOTIFICATION_COLUMNS =
  'id,user_id,kind,title,message,order_id,listing_id,created_at,read_at'

export const RPCS = {
  placeOrder: 'place_order',
  advanceOrderStatus: 'advance_order_status',
  rateDeliveredOrder: 'rate_delivered_order',
  createActivityReport: 'create_activity_report',
} as const

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

export type PlaceOrderParams = {
  p_listing_id: string
  p_quantity_kg: number
  p_delivery_window: string
  p_delivery_area: string
  p_notes: string
}

export type AdvanceOrderStatusParams = {
  p_order_id: string
  p_next_status: HarvestOrder['status']
}

export type RateDeliveredOrderParams = {
  p_order_id: string
  p_rating: number
  p_note: string
}

/** The activity-report RPC returns the signed report token, not a full URL. */
export type CreateActivityReportResult = string

