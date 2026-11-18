import { useCallback, useState } from 'react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase'
import { useHarvestLink } from '@/components/harvestlink/context'
import type { HarvestOrder, HarvestRole, Profile } from './types'
import { categoryForCrop, imageForCrop } from './utils'

export { useActivityReport } from './use-report'

export function friendlyOrderError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('insufficient_stock')) return 'That harvest quantity changed. Choose a little less and try again.'
  if (text.includes('listing_unavailable')) return 'That harvest has just been picked up. Choose another listing.'
  if (text.includes('cannot_order_own')) return 'You can’t place an order on your own listing.'
  if (text.includes('buyer_profile_required')) return 'Switch your profile to Buyer or Both before placing an order.'
  if (text.includes('sample_listing_not_orderable')) return 'This is sample inventory and can’t be ordered.'
  if (text.includes('invalid_quantity')) return 'Choose a valid quantity that is available from this farm.'
  return 'We couldn’t place that order. Check your connection and try again.'
}

export type PlaceOrderInput = {
  listingId: string
  farmerId?: string | null
  quantityKg: number
  deliveryWindow: string
  deliveryArea?: string
  notes?: string
}

export function usePlaceOrder() {
  const { user, profile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeOrder = useCallback(
    async (input: PlaceOrderInput): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to place an order.'
        setError(msg)
        return { error: msg, success: false }
      }
      const role = profile?.role
      if (role !== 'buyer' && role !== 'both') {
        const msg = 'Choose Buyer or Both in your profile before placing an order.'
        setError(msg)
        return { error: msg, success: false }
      }
      if (!Number.isFinite(input.quantityKg) || input.quantityKg <= 0) {
        const msg = 'Choose a valid quantity that is available from this farm.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const area = input.deliveryArea || profile?.default_area || 'Lekki'
      const { error: rpcError } = await supabase.rpc('place_order', {
        p_listing_id: input.listingId,
        p_quantity_kg: input.quantityKg,
        p_delivery_window: input.deliveryWindow,
        p_delivery_area: area,
        p_notes: (input.notes ?? '').trim(),
      })

      setBusy(false)

      if (rpcError) {
        const friendly = friendlyOrderError(rpcError.message)
        setError(friendly)
        return { error: friendly, success: false }
      }

      await Promise.all([
        mutate(['harvestlink-orders', user.id]),
        mutate(['harvestlink-notifications', user.id]),
        mutate('harvestlink-listings'),
        input.farmerId ? mutate(['harvestlink-farmer-listings', input.farmerId]) : Promise.resolve(),
      ])

      return { error: null, success: true }
    },
    [mutate, profile?.default_area, profile?.role, user],
  )

  return { placeOrder, busy, error, setError }
}

export function useAdvanceOrder() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advanceOrder = useCallback(
    async (orderId: string, nextStatus: HarvestOrder['status']): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to update an order.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const { error: rpcError } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_next_status: nextStatus,
      })

      setBusy(false)

      if (rpcError) {
        const msg = 'That order update could not be saved. Refresh and try again.'
        setError(msg)
        return { error: msg, success: false }
      }

      await Promise.all([
        mutate(['harvestlink-orders', user.id]),
        mutate(['harvestlink-notifications', user.id]),
      ])

      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { advanceOrder, busy, error, setError }
}

export function useRateOrder() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rateOrder = useCallback(
    async (orderId: string, rating: number, note: string = ''): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to rate a delivered order.'
        setError(msg)
        return { error: msg, success: false }
      }
      if (rating < 1 || rating > 5) {
        const msg = 'Select a rating between 1 and 5 stars.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const { error: rpcError } = await supabase.rpc('rate_delivered_order', {
        p_order_id: orderId,
        p_rating: rating,
        p_note: note.trim(),
      })

      setBusy(false)

      if (rpcError) {
        const msg = rpcError.message.includes('order_not_rateable')
          ? 'This order can no longer be rated. Refresh your orders and try again.'
          : 'We couldn’t save your rating. Please try again.'
        setError(msg)
        return { error: msg, success: false }
      }

      await mutate(['harvestlink-orders', user.id])
      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { rateOrder, busy, error, setError }
}

export type CreateListingInput = {
  crop: string
  category?: string
  pricePerKg: number
  availableKg: number
  estimatedShelfLifeDays?: number
  harvestedOn?: string
  scanConfidence?: number | null
  imageUrl?: string
  area?: string
  farmName?: string
}

export function useCreateListing() {
  const { user, profile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createListing = useCallback(
    async (input: CreateListingInput): Promise<{ error: string | null; success: boolean }> => {
      if (!user || !profile) {
        const msg = 'Sign in and finish your farmer profile before publishing a harvest.'
        setError(msg)
        return { error: msg, success: false }
      }
      const roleAllowed = profile.role === 'farmer' || profile.role === 'both'
      if (!roleAllowed) {
        const msg = 'Choose Farmer or Both in your profile before publishing a harvest.'
        setError(msg)
        return { error: msg, success: false }
      }

      const cropTrimmed = input.crop.trim()
      const numericPrice = Number(input.pricePerKg)
      const numericQuantity = Number(input.availableKg)
      const numericDays = input.estimatedShelfLifeDays !== undefined ? Number(input.estimatedShelfLifeDays) : 0

      if (
        !cropTrimmed ||
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0 ||
        !Number.isFinite(numericQuantity) ||
        numericQuantity <= 0 ||
        !Number.isInteger(numericDays) ||
        numericDays < 0 ||
        numericDays > 30
      ) {
        const msg = 'Add a crop, a price, a quantity, and a shelf-life estimate to continue.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const category = input.category || categoryForCrop(cropTrimmed)
      const imageUrl = input.imageUrl || imageForCrop(cropTrimmed)
      const farmName = input.farmName?.trim() || profile.farm_name || 'Independent farm'
      const area = input.area || profile.default_area || 'Lekki'
      const harvestedOn = input.harvestedOn || new Date().toISOString().slice(0, 10)

      const { error: insertError } = await supabase.from('listings').insert({
        farmer_id: user.id,
        farmer_name: profile.display_name,
        farm_name: farmName,
        crop: cropTrimmed,
        category,
        price_per_kg: numericPrice,
        available_kg: numericQuantity,
        harvested_on: harvestedOn,
        estimated_shelf_life_days: numericDays,
        scan_confidence: input.scanConfidence ?? null,
        image_url: imageUrl,
        area,
        is_demo: false,
      })

      setBusy(false)

      if (insertError) {
        const msg = 'This harvest could not be published. Check the details and try again.'
        setError(msg)
        return { error: msg, success: false }
      }

      await Promise.all([
        mutate('harvestlink-listings'),
        mutate(['harvestlink-farmer-listings', user.id]),
      ])

      return { error: null, success: true }
    },
    [mutate, profile, user],
  )

  return { createListing, busy, error, setError }
}

export type UpdateProfileInput = {
  displayName?: string
  farmName?: string | null
  role?: HarvestRole
  defaultArea?: string
  phone?: string | null
}

export function useUpdateProfile() {
  const { user, profile, refreshProfile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(
    async (fields: UpdateProfileInput): Promise<{ error: string | null; success: boolean; profile: Profile | null }> => {
      if (!user) {
        const msg = 'Sign in to update your profile.'
        setError(msg)
        return { error: msg, success: false, profile: null }
      }

      if (fields.displayName !== undefined && fields.displayName.trim().length < 2) {
        const msg = 'Add a name with at least two characters.'
        setError(msg)
        return { error: msg, success: false, profile: null }
      }

      setBusy(true)
      setError(null)

      const payload: Record<string, unknown> = {}
      if (fields.displayName !== undefined) payload.display_name = fields.displayName.trim()
      if (fields.farmName !== undefined) payload.farm_name = fields.farmName?.trim() || null
      if (fields.role !== undefined) payload.role = fields.role
      if (fields.defaultArea !== undefined) payload.default_area = fields.defaultArea
      if (fields.phone !== undefined) payload.phone = fields.phone?.trim() || null

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select('id,display_name,phone,role,default_area,farm_name')
        .maybeSingle()

      setBusy(false)

      if (updateError) {
        const msg = 'Your profile could not be saved. Check your connection and try again.'
        setError(msg)
        return { error: msg, success: false, profile: null }
      }

      const updated = (data as Profile | null) ?? null
      if (updated) {
        await mutate(['harvestlink-profile', user.id], updated)
      }
      await refreshProfile()

      return { error: null, success: true, profile: updated }
    },
    [mutate, refreshProfile, user],
  )

  return { updateProfile, busy, error, setError }
}
