import { ORDER_STATUSES, type HarvestOrder, type Listing, type ListingUnit } from './types'

export const BUYER_AREAS = [
  'Lekki',
  'Victoria Island',
  'Ikoyi',
  'Yaba',
  'Ikeja',
  'Surulere',
  'Ajah',
  'Gbagada',
] as const

export const FARM_HUBS = [
  'Ikorodu',
  'Epe',
  'Badagry',
  'Mile 12',
  'Ogun Corridor',
  'Agege',
] as const

export const AREAS = [...BUYER_AREAS, ...FARM_HUBS] as const

export const CATEGORIES = ['All produce', 'Tomatoes', 'Leafy greens', 'Peppers', 'Maize', 'Fruits'] as const

export const CROPS = ['Tomatoes', 'Leafy greens', 'Peppers', 'Maize', 'Plantain', 'Other'] as const

export const UNIT_OPTIONS: ListingUnit[] = [
  'Baskets (Big)',
  'Baskets (Small)',
  'Sacks',
  'Crates',
  'kg',
]

export const DELIVERY_WINDOWS = [
  'Today · 12–3 pm',
  'Today · 3–6 pm',
  'Tomorrow · 9 am–12 pm',
] as const

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

export function todayInLagos() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

export function normalizeUnit(unit?: string | null): ListingUnit {
  const raw = (unit ?? '').trim()
  if (!raw || raw === 'Kilograms (kg)' || raw.toLowerCase() === 'kg') return 'kg'
  if (raw === 'Baskets (Big)') return 'Baskets (Big)'
  if (raw === 'Baskets (Small)') return 'Baskets (Small)'
  if (raw === 'Sacks') return 'Sacks'
  if (raw === 'Crates') return 'Crates'
  return 'kg'
}

export function formatUnitSingular(unit?: string | null): string {
  const normalized = normalizeUnit(unit)
  if (normalized === 'Baskets (Big)') return 'big basket'
  if (normalized === 'Baskets (Small)') return 'small basket'
  if (normalized === 'Sacks') return 'sack'
  if (normalized === 'Crates') return 'crate'
  return 'kg'
}

export function formatUnitCount(qty: number | string, unit?: string | null): string {
  const num = Number(qty) || 0
  const formatted = formatQuantity(num)
  const normalized = normalizeUnit(unit)
  if (normalized === 'kg') return `${formatted} kg`
  const singular = formatUnitSingular(normalized)
  return num === 1 ? `${formatted} ${singular}` : `${formatted} ${singular}s`
}

export function isDiscreteUnit(unit?: string | null): boolean {
  return normalizeUnit(unit) !== 'kg'
}

export function nextOrderStatus(status: HarvestOrder['status']): HarvestOrder['status'] | null {
  const index = ORDER_STATUSES.indexOf(status)
  return index < 0 || index === ORDER_STATUSES.length - 1 ? null : ORDER_STATUSES[index + 1]
}

/** The shelf-scan API returns confidence as 0–1 (decimal). Render as whole-number %. */
export function formatConfidence(confidence: number | string | null | undefined): string {
  if (confidence == null || confidence === '') return '—'
  const num = Number(confidence)
  if (!Number.isFinite(num)) return '—'
  const pct = num <= 1 ? Math.round(num * 100) : Math.round(num)
  return `${Math.max(0, Math.min(100, pct))}%`
}

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

export function isLocalFileUri(uri: string) {
  return /^(file|content|ph|assets-library):\/\//i.test(uri.trim())
}

export function imageForCrop(crop: string): string {
  const value = crop.toLowerCase()
  if (value.includes('tomato')) return '/images/tomatoes.jpg'
  if (value.includes('pepper')) return '/images/peppers.jpg'
  if (value.includes('plantain') || value.includes('fruit') || value.includes('maize')) return '/images/plantain.jpg'
  return '/images/greens.jpg'
}

export function categoryForCrop(crop: string): string {
  if (crop === 'Tomatoes') return 'Tomatoes'
  if (crop === 'Peppers') return 'Peppers'
  if (crop === 'Leafy greens' || crop === 'Leafy Greens') return 'Leafy greens'
  if (crop === 'Maize') return 'Other'
  if (crop === 'Plantain') return 'Fruits'
  return 'Other'
}

export function buildPhoneLink(phone?: string | null): string | null {
  if (!phone) return null
  const normalized = normalizeNigerianPhone(phone)
  return /^\+\d{10,15}$/.test(normalized) ? `tel:${normalized}` : null
}

export function buildWhatsAppLink(phone?: string | null, text?: string): string | null {
  if (!phone) return null
  const normalized = normalizeNigerianPhone(phone).replace(/\+/g, '')
  if (!/^\d{10,15}$/.test(normalized)) return null
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${normalized}${query}`
}
