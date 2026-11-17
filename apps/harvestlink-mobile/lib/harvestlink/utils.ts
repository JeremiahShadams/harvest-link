import type { HarvestOrder, Listing } from './types'

export const AREAS = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja', 'Surulere']

export const CATEGORIES = ['All produce', 'Tomatoes', 'Leafy greens', 'Peppers', 'Maize', 'Fruits']

export const CROPS = ['Tomatoes', 'Leafy greens', 'Peppers', 'Maize', 'Plantain', 'Other']

export const DELIVERY_WINDOWS = [
  'Today · 12–3 pm',
  'Today · 3–6 pm',
  'Tomorrow · 9 am–12 pm',
]

export function normalizeNigerianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`
  if (digits.startsWith('234')) return `+${digits}`
  return `+${digits}`
}

export function formatNaira(value: number | string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

export function formatQuantity(value: number | string) {
  return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 1 }).format(Number(value) || 0)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value))
}

export function nextOrderStatus(status: HarvestOrder['status']): HarvestOrder['status'] | null {
  const index = ORDER_FLOW.indexOf(status)
  return index < 0 || index === ORDER_FLOW.length - 1 ? null : ORDER_FLOW[index + 1]
}

const ORDER_FLOW: HarvestOrder['status'][] = ['pending', 'accepted', 'ready', 'out_for_delivery', 'delivered']

export function getListingCategory(listing: Pick<Listing, 'category' | 'crop'>) {
  const value = `${listing.category} ${listing.crop}`.toLowerCase()
  if (value.includes('tomato')) return 'Tomatoes'
  if (value.includes('pepper')) return 'Peppers'
  if (value.includes('leaf') || value.includes('ugu') || value.includes('spinach')) return 'Leafy greens'
  if (value.includes('maize') || value.includes('corn')) return 'Maize'
  if (value.includes('fruit') || value.includes('plantain') || value.includes('mango')) return 'Fruits'
  return 'Other'
}

export function getListingImageUrl(listing: Pick<Listing, 'image_url'>) {
  return /^https?:\/\//i.test(listing.image_url) ? listing.image_url : null
}
