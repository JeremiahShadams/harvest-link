import { useCallback, useRef, useState } from 'react'
import { File as LocalExpoFile } from 'expo-file-system'
import { Platform } from 'react-native'
import { useSWRConfig } from 'swr'
import { getApiBaseUrl, supabase } from '@/lib/supabase'
import { useHarvestLink } from '@/components/harvestlink/context'
import { triggerErrorHaptic, triggerSuccessHaptic } from './haptics'
import {
  PROFILE_COLUMNS,
  RPCS,
  STORAGE_BUCKETS,
  type HarvestOrder,
  type HarvestRole,
  type Listing,
  type Profile,
  type ShelfLifeResult,
} from './types'
import {
  categoryForCrop,
  imageForCrop,
  isLocalFileUri,
  normalizeNigerianPhone,
  normalizeUnit,
  todayInLagos,
} from './utils'

export { useActivityReport } from './use-report'

const MAX_PHOTO_BYTES = 6 * 1024 * 1024

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

export function explainAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('rate') || normalized.includes('too many')) return 'Too many code requests. Please wait a little and try again.'
  if (normalized.includes('phone_provider_disabled') || normalized.includes('phone auth')) {
    return 'Phone sign-in is not enabled for this project yet. Ask your project administrator to enable SMS sign-in.'
  }
  return 'We couldn’t complete phone verification. Check the number or code and try again.'
}

async function readLocalPhotoBytes(uri: string): Promise<{ bytes: Uint8Array; contentType: string; ext: string }> {
  const lower = uri.toLowerCase()
  const ext = lower.endsWith('.png') ? 'png' : lower.endsWith('.webp') ? 'webp' : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

  if (Platform.OS === 'web') {
    const response = await fetch(uri)
    const buffer = await response.arrayBuffer()
    return { bytes: new Uint8Array(buffer), contentType, ext }
  }

  try {
    const file = new LocalExpoFile(uri)
    const bytes = await file.bytes()
    return { bytes, contentType, ext }
  } catch {
    const response = await fetch(uri)
    const buffer = await response.arrayBuffer()
    return { bytes: new Uint8Array(buffer), contentType, ext }
  }
}

/**
 * Uploads a selected local produce photo to Supabase Storage.
 * Never swallows errors or silently falls back to a stock image.
 */
export async function uploadListingPhoto(uri: string, userId: string): Promise<string> {
  if (!isLocalFileUri(uri) && /^https?:\/\//i.test(uri)) {
    return uri
  }

  const { bytes, contentType, ext } = await readLocalPhotoBytes(uri)
  if (!bytes || bytes.byteLength === 0) {
    throw new Error('Could not read the selected photo from this device.')
  }
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error('Selected photo exceeds 6 MB. Choose a smaller photo and try again.')
  }

  const randomSuffix = Math.random().toString(36).slice(2, 8)
  const objectPath = `${userId}/${Date.now()}-${randomSuffix}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.listingPhotos)
    .upload(objectPath, bytes, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(
      `Photo upload failed (${uploadError.message}). Your listing was not published—never falling back to a fake image.`,
    )
  }

  const { data } = supabase.storage.from(STORAGE_BUCKETS.listingPhotos).getPublicUrl(objectPath)
  if (!data?.publicUrl) {
    throw new Error('Photo uploaded, but no public image URL was returned.')
  }
  return data.publicUrl
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
        triggerErrorHaptic()
        return { error: msg, success: false }
      }
      const role = profile?.role
      if (role !== 'buyer' && role !== 'both') {
        const msg = 'Choose Buyer or Both in your profile before placing an order.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }
      if (!Number.isFinite(input.quantityKg) || input.quantityKg <= 0) {
        const msg = 'Choose a valid quantity that is available from this farm.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const area = input.deliveryArea || profile?.default_area || 'Lekki'
      const { error: rpcError } = await supabase.rpc(RPCS.placeOrder, {
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
        triggerErrorHaptic()
        return { error: friendly, success: false }
      }

      triggerSuccessHaptic()
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
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const { error: rpcError } = await supabase.rpc(RPCS.advanceOrderStatus, {
        p_order_id: orderId,
        p_next_status: nextStatus,
      })

      setBusy(false)

      if (rpcError) {
        const msg = 'That order update could not be saved. Refresh and try again.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      triggerSuccessHaptic()
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
        triggerErrorHaptic()
        return { error: msg, success: false }
      }
      if (rating < 1 || rating > 5) {
        const msg = 'Select a rating between 1 and 5 stars.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      const { error: rpcError } = await supabase.rpc(RPCS.rateDeliveredOrder, {
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
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      triggerSuccessHaptic()
      await mutate(['harvestlink-orders', user.id])
      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { rateOrder, busy, error, setError }
}

export function useMarkNotificationRead() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markRead = useCallback(
    async (notificationId: string): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to manage your updates.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)
      const { error: updateError } = await supabase
        .from('harvest_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .is('read_at', null)
      setBusy(false)

      if (updateError) {
        const msg = 'This update could not be marked as read. Try again shortly.'
        setError(msg)
        return { error: msg, success: false }
      }

      await mutate(['harvestlink-notifications', user.id])
      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { markRead, busy, error, setError }
}

export function useMarkAllNotificationsRead() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markAllRead = useCallback(async (): Promise<{ error: string | null; success: boolean }> => {
    if (!user) {
      const msg = 'Sign in to manage your updates.'
      setError(msg)
      return { error: msg, success: false }
    }

    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('harvest_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
    setBusy(false)

    if (updateError) {
      const msg = 'Your updates could not be marked as read. Try again shortly.'
      setError(msg)
      return { error: msg, success: false }
    }

    await mutate(['harvestlink-notifications', user.id])
    return { error: null, success: true }
  }, [mutate, user])

  return { markAllRead, busy, error, setError }
}

export type CreateListingInput = {
  crop: string
  category?: string
  pricePerKg: number
  availableKg: number
  unit: string
  estimatedShelfLifeDays: number
  harvestedOn?: string
  scanConfidence?: number | null
  localPhotoUri?: string | null
  imageUrl?: string
  area?: string
  farmName?: string
}

export function useCreateListing() {
  const { user, profile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createListing = useCallback(
    async (input: CreateListingInput): Promise<{ error: string | null; success: boolean }> => {
      if (!user || !profile) {
        const msg = 'Sign in and finish your farmer profile before publishing a harvest.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }
      const roleAllowed = profile.role === 'farmer' || profile.role === 'both'
      if (!roleAllowed) {
        const msg = 'Choose Farmer or Both in your profile before publishing a harvest.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      const cropTrimmed = input.crop.trim()
      const numericPrice = Number(input.pricePerKg)
      const numericQuantity = Number(input.availableKg)
      const numericDays = Number(input.estimatedShelfLifeDays)
      const unit = normalizeUnit(input.unit)

      if (
        cropTrimmed.length < 2 ||
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0 ||
        !Number.isFinite(numericQuantity) ||
        numericQuantity <= 0 ||
        !Number.isInteger(numericDays) ||
        numericDays < 1 ||
        numericDays > 60
      ) {
        const msg = 'Add a crop, unit, price, quantity, and shelf-life estimate (1–60 days) to continue.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)

      let finalImageUrl = input.imageUrl
      if (input.localPhotoUri) {
        setProgress('Uploading produce photo…')
        try {
          finalImageUrl = await uploadListingPhoto(input.localPhotoUri, user.id)
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error
            ? uploadErr.message
            : 'Photo upload failed. Check your connection and try again.'
          setProgress(null)
          setBusy(false)
          setError(msg)
          triggerErrorHaptic()
          return { error: msg, success: false }
        }
      } else if (!finalImageUrl) {
        finalImageUrl = imageForCrop(cropTrimmed)
      }

      setProgress('Publishing harvest…')

      const category = input.category || categoryForCrop(cropTrimmed)
      const farmName = input.farmName?.trim() || profile.farm_name || 'Independent farm'
      const area = input.area || profile.default_area || 'Ikorodu'
      const harvestedOn = input.harvestedOn || todayInLagos()

      const { error: insertError } = await supabase.from('listings').insert({
        farmer_id: user.id,
        farmer_name: profile.display_name,
        farm_name: farmName,
        crop: cropTrimmed,
        category,
        price_per_kg: numericPrice,
        available_kg: numericQuantity,
        unit,
        harvested_on: harvestedOn,
        estimated_shelf_life_days: numericDays,
        scan_confidence: input.scanConfidence ?? null,
        image_url: finalImageUrl,
        area,
        status: 'active',
        is_demo: false,
      })

      setProgress(null)
      setBusy(false)

      if (insertError) {
        const msg = insertError.message.toLowerCase().includes('unit')
          ? 'Database unit column missing. Apply supabase/migrations/20261125_units_and_storage.sql and retry.'
          : 'This harvest could not be published. Check the details and try again.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      triggerSuccessHaptic()
      await Promise.all([
        mutate('harvestlink-listings'),
        mutate(['harvestlink-farmer-listings', user.id]),
      ])

      return { error: null, success: true }
    },
    [mutate, profile, user],
  )

  return { createListing, busy, progress, error, setError }
}

export type UpdateListingInput = {
  listingId: string
  pricePerKg?: number
  availableKg?: number
  unit?: string
  status?: Listing['status']
  estimatedShelfLifeDays?: number
}

export function useUpdateListing() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateListing = useCallback(
    async (input: UpdateListingInput): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to update your harvest.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      const payload: Record<string, unknown> = {}
      if (input.pricePerKg !== undefined) {
        if (!Number.isFinite(input.pricePerKg) || input.pricePerKg <= 0) {
          const msg = 'Enter a valid price greater than zero.'
          setError(msg)
          return { error: msg, success: false }
        }
        payload.price_per_kg = input.pricePerKg
      }
      if (input.availableKg !== undefined) {
        if (!Number.isFinite(input.availableKg) || input.availableKg < 0) {
          const msg = 'Quantity cannot be negative.'
          setError(msg)
          return { error: msg, success: false }
        }
        payload.available_kg = input.availableKg
      }
      if (input.unit !== undefined) payload.unit = normalizeUnit(input.unit)
      if (input.status !== undefined) payload.status = input.status
      if (input.estimatedShelfLifeDays !== undefined) {
        payload.estimated_shelf_life_days = Math.max(0, Math.min(60, Math.round(input.estimatedShelfLifeDays)))
      }

      setBusy(true)
      setError(null)
      const { error: updateError } = await supabase
        .from('listings')
        .update(payload)
        .eq('id', input.listingId)
        .eq('farmer_id', user.id)
      setBusy(false)

      if (updateError) {
        const msg = 'Your harvest could not be updated. Check your connection and try again.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      triggerSuccessHaptic()
      await Promise.all([
        mutate('harvestlink-listings'),
        mutate(['harvestlink-farmer-listings', user.id]),
      ])
      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { updateListing, busy, error, setError }
}

export function useDeleteListing() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteListing = useCallback(
    async (listingId: string): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to remove your harvest.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('farmer_id', user.id)
      setBusy(false)

      if (deleteError) {
        const msg = 'This harvest could not be deleted (it may already have orders). Try hiding it instead.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false }
      }

      triggerSuccessHaptic()
      await Promise.all([
        mutate('harvestlink-listings'),
        mutate(['harvestlink-farmer-listings', user.id]),
      ])
      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { deleteListing, busy, error, setError }
}

export function useSaveScan() {
  const { user } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveScan = useCallback(
    async (scan: ShelfLifeResult): Promise<{ error: string | null; success: boolean }> => {
      if (!user) {
        const msg = 'Sign in to save a scan.'
        setError(msg)
        return { error: msg, success: false }
      }

      setBusy(true)
      setError(null)
      const { error: saveError } = await supabase.from('produce_scans').insert({
        user_id: user.id,
        crop: scan.crop,
        remaining_days: scan.remaining_days,
        confidence: scan.confidence,
        storage_tips: scan.storage_tips,
      })
      setBusy(false)

      if (saveError) {
        const msg = 'Your estimate is ready, but we couldn’t add it to your scan history.'
        setError(msg)
        return { error: msg, success: false }
      }

      await Promise.all([
        mutate(['harvestlink-scans', user.id]),
        mutate(['harvestlink-notifications', user.id]),
      ])
      return { error: null, success: true }
    },
    [mutate, user],
  )

  return { saveScan, busy, error, setError }
}

export type SelectedScanPhoto = {
  uri: string
  file?: File
  name: string
  mimeType: string
  fileSize?: number
}

export function useAnalyzeScan() {
  const { setLatestScan } = useHarvestLink()
  const { saveScan } = useSaveScan()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setError(null)
  }, [])

  const analyze = useCallback(
    async (
      photo: SelectedScanPhoto,
      cropHint: string,
    ): Promise<{ error: string | null; success: boolean; scan: ShelfLifeResult | null }> => {
      const apiBase = getApiBaseUrl()
      if (!apiBase) {
        const msg = 'Freshness analysis is not connected. Set the mobile app API URL and try again.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false, scan: null }
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setBusy(true)
      setError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const msg = 'Sign in to scan.'
          setError(msg)
          setBusy(false)
          return { error: msg, success: false, scan: null }
        }

        const formData = new FormData()
        formData.append('cropHint', cropHint.trim())
        if (Platform.OS === 'web' && photo.file) {
          formData.append('image', photo.file, photo.name)
        } else if (Platform.OS === 'web') {
          const response = await fetch(photo.uri, { signal: controller.signal })
          const blob = await response.blob()
          if (blob.size > MAX_PHOTO_BYTES) {
            throw new Error('Choose a photo smaller than 6 MB for a quicker estimate.')
          }
          formData.append('image', blob, photo.name)
        } else {
          formData.append('image', { uri: photo.uri, name: photo.name, type: photo.mimeType } as unknown as Blob)
        }

        const response = await fetch(`${apiBase}/api/shelf-scan`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
          signal: controller.signal,
        })
        const body = await response.json() as ShelfLifeResult | { error?: string }
        if (!response.ok) throw new Error('error' in body && body.error ? body.error : 'This scan could not be completed.')

        if (controller.signal.aborted) {
          return { error: null, success: false, scan: null }
        }

        const scan = body as ShelfLifeResult
        setLatestScan(scan)
        const saved = await saveScan(scan)
        setBusy(false)
        abortRef.current = null
        triggerSuccessHaptic()
        return { error: saved.error, success: true, scan }
      } catch (caught) {
        if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) {
          setBusy(false)
          return { error: null, success: false, scan: null }
        }
        const msg = caught instanceof Error ? caught.message : 'The scan could not be completed. Please try another photo.'
        setError(msg)
        setBusy(false)
        abortRef.current = null
        triggerErrorHaptic()
        return { error: msg, success: false, scan: null }
      }
    },
    [saveScan, setLatestScan],
  )

  return { analyze, cancel, busy, error, setError }
}

export type UpdateProfileInput = {
  displayName?: string
  farmName?: string | null
  role?: HarvestRole
  defaultArea?: string
  phone?: string | null
}

export function useUpdateProfile() {
  const { user, refreshProfile } = useHarvestLink()
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
        triggerErrorHaptic()
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
        .select(PROFILE_COLUMNS)
        .maybeSingle()

      if (updateError) {
        setBusy(false)
        const msg = 'Your profile could not be saved. Check your connection and try again.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false, profile: null }
      }

      let updated = (data as Profile | null) ?? null
      if (!updated && fields.displayName) {
        const fallbackRole = fields.role ?? 'buyer'
        const insertPayload: Profile = {
          id: user.id,
          display_name: fields.displayName.trim(),
          phone: user.phone ?? null,
          role: fallbackRole,
          default_area: fields.defaultArea ?? 'Lekki',
          farm_name: fallbackRole === 'buyer' ? null : fields.farmName?.trim() || null,
        }
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert(insertPayload)
          .select(PROFILE_COLUMNS)
          .maybeSingle()
        if (insertError) {
          setBusy(false)
          const msg = 'Your profile could not be saved. Check your connection and try again.'
          setError(msg)
          triggerErrorHaptic()
          return { error: msg, success: false, profile: null }
        }
        updated = (inserted as Profile | null) ?? insertPayload
      }

      setBusy(false)
      if (updated) {
        await mutate(['harvestlink-profile', user.id], updated)
      }
      await refreshProfile(user.id)
      triggerSuccessHaptic()

      return { error: null, success: true, profile: updated }
    },
    [mutate, refreshProfile, user],
  )

  return { updateProfile, busy, error, setError }
}

export type CompleteOnboardingInput = {
  name: string
  role: HarvestRole
  farmName?: string
  area: string
}

export function usePhoneAuth() {
  const { user, refreshProfile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = useCallback(
    async (rawPhone: string): Promise<{ error: string | null; success: boolean; phone: string }> => {
      setError(null)
      const normalizedPhone = normalizeNigerianPhone(rawPhone)
      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        const msg = 'Enter a valid Nigerian phone number (e.g. 0801 234 5678).'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false, phone: normalizedPhone }
      }

      setBusy(true)
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: { shouldCreateUser: true },
        })
        setBusy(false)
        if (otpError) {
          const msg = explainAuthError(otpError.message)
          setError(msg)
          triggerErrorHaptic()
          return { error: msg, success: false, phone: normalizedPhone }
        }
        triggerSuccessHaptic()
        return { error: null, success: true, phone: normalizedPhone }
      } catch {
        const msg = 'We couldn’t send a code right now. Check your connection and try again.'
        setError(msg)
        setBusy(false)
        triggerErrorHaptic()
        return { error: msg, success: false, phone: normalizedPhone }
      }
    },
    [],
  )

  const verifyCode = useCallback(
    async (
      phone: string,
      token: string,
    ): Promise<{ error: string | null; success: boolean; needsOnboarding: boolean; profile: Profile | null }> => {
      setError(null)
      if (!/^\d{6}$/.test(token.trim())) {
        const msg = 'Enter the 6-digit code sent to your phone.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false, needsOnboarding: false, profile: null }
      }

      setBusy(true)
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          phone,
          token: token.trim(),
          type: 'sms',
        })
        if (verifyError || !data.user) {
          const msg = explainAuthError(verifyError?.message ?? 'verification_failed')
          setError(msg)
          setBusy(false)
          triggerErrorHaptic()
          return { error: msg, success: false, needsOnboarding: false, profile: null }
        }

        const { data: existingData, error: fetchError } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', data.user.id)
          .maybeSingle()

        if (fetchError) {
          setBusy(false)
          const msg = 'Your number is verified, but we couldn’t check your account. Please try again.'
          setError(msg)
          triggerErrorHaptic()
          return { error: msg, success: false, needsOnboarding: false, profile: null }
        }

        const existing = (existingData as Profile | null) ?? null
        if (existing) {
          await mutate(['harvestlink-profile', data.user.id], existing, { revalidate: false })
          await refreshProfile(data.user.id)
          setBusy(false)
          triggerSuccessHaptic()
          return { error: null, success: true, needsOnboarding: false, profile: existing }
        }

        // First-time user: do NOT auto-upsert or overwrite anything yet; prompt onboarding step.
        setBusy(false)
        triggerSuccessHaptic()
        return { error: null, success: true, needsOnboarding: true, profile: null }
      } catch {
        const msg = 'We couldn’t complete phone verification. Please try again.'
        setError(msg)
        setBusy(false)
        triggerErrorHaptic()
        return { error: msg, success: false, needsOnboarding: false, profile: null }
      }
    },
    [mutate, refreshProfile],
  )

  const completeOnboarding = useCallback(
    async (
      input: CompleteOnboardingInput,
    ): Promise<{ error: string | null; success: boolean; profile: Profile | null }> => {
      setError(null)
      if (input.name.trim().length < 2) {
        const msg = 'Add a name with at least two characters.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false, profile: null }
      }
      const currentUser = user ?? (await supabase.auth.getUser()).data.user
      if (!currentUser) {
        const msg = 'Your session expired. Verify your phone number again.'
        setError(msg)
        return { error: msg, success: false, profile: null }
      }

      setBusy(true)
      const profile: Profile = {
        id: currentUser.id,
        display_name: input.name.trim(),
        phone: currentUser.phone ?? null,
        role: input.role,
        default_area: input.area,
        farm_name: input.role === 'buyer' ? null : input.farmName?.trim() || null,
      }

      const { error: insertError } = await supabase.from('profiles').insert(profile)
      setBusy(false)

      if (insertError) {
        const msg = 'Could not save your new profile. Check your connection and try again.'
        setError(msg)
        triggerErrorHaptic()
        return { error: msg, success: false, profile: null }
      }

      await mutate(['harvestlink-profile', currentUser.id], profile, { revalidate: false })
      await refreshProfile(currentUser.id)
      triggerSuccessHaptic()
      return { error: null, success: true, profile }
    },
    [mutate, refreshProfile, user],
  )

  return { sendCode, verifyCode, completeOnboarding, busy, error, setError }
}

export function useSignOut() {
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = useCallback(async (): Promise<{ error: string | null; success: boolean }> => {
    setBusy(true)
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    setBusy(false)

    if (signOutError) {
      const msg = 'We couldn’t sign you out. Please try again.'
      setError(msg)
      triggerErrorHaptic()
      return { error: msg, success: false }
    }

    await Promise.all([
      mutate('harvestlink-listings', undefined, { revalidate: false }),
      mutate((key: unknown) => Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith('harvestlink-'), undefined, { revalidate: false }),
    ])
    return { error: null, success: true }
  }, [mutate])

  return { signOut, busy, error, setError }
}
