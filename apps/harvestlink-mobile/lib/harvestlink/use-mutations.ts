import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import { useSWRConfig } from 'swr'
import { getApiBaseUrl, supabase } from '@/lib/supabase'
import { useHarvestLink } from '@/components/harvestlink/context'
import {
  PROFILE_COLUMNS,
  RPCS,
  type HarvestOrder,
  type HarvestRole,
  type Profile,
  type ShelfLifeResult,
} from './types'
import { categoryForCrop, imageForCrop, normalizeNigerianPhone, todayInLagos } from './utils'

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

export function explainAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('rate') || normalized.includes('too many')) return 'Too many code requests. Please wait a little and try again.'
  if (normalized.includes('phone_provider_disabled') || normalized.includes('phone auth')) {
    return 'Phone sign-in is not enabled for this project yet. Ask your project administrator to enable SMS sign-in.'
  }
  return 'We couldn’t complete phone verification. Check the number or code and try again.'
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

      const { error: rpcError } = await supabase.rpc(RPCS.advanceOrderStatus, {
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
        return { error: msg, success: false }
      }

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
      const numericDays = Number(input.estimatedShelfLifeDays)

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
      const harvestedOn = input.harvestedOn || todayInLagos()

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

  const analyze = useCallback(
    async (
      photo: SelectedScanPhoto,
      cropHint: string,
    ): Promise<{ error: string | null; success: boolean; scan: ShelfLifeResult | null }> => {
      const apiBase = getApiBaseUrl()
      if (!apiBase) {
        const msg = 'Freshness analysis is not connected. Set the mobile app API URL and try again.'
        setError(msg)
        return { error: msg, success: false, scan: null }
      }

      setBusy(true)
      setError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const msg = 'Sign in to scan.'
          setError(msg)
          return { error: msg, success: false, scan: null }
        }

        const formData = new FormData()
        formData.append('cropHint', cropHint.trim())
        if (Platform.OS === 'web' && photo.file) {
          formData.append('image', photo.file, photo.name)
        } else if (Platform.OS === 'web') {
          const response = await fetch(photo.uri)
          const blob = await response.blob()
          if (blob.size > 6 * 1024 * 1024) {
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
        })
        const body = await response.json() as ShelfLifeResult | { error?: string }
        if (!response.ok) throw new Error('error' in body && body.error ? body.error : 'This scan could not be completed.')

        const scan = body as ShelfLifeResult
        setLatestScan(scan)
        const saved = await saveScan(scan)
        setBusy(false)
        return { error: saved.error, success: true, scan }
      } catch (caught) {
        const msg = caught instanceof Error ? caught.message : 'The scan could not be completed. Please try another photo.'
        setError(msg)
        setBusy(false)
        return { error: msg, success: false, scan: null }
      }
    },
    [saveScan, setLatestScan],
  )

  return { analyze, busy, error, setError }
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
      await refreshProfile(user.id)

      return { error: null, success: true, profile: updated }
    },
    [mutate, refreshProfile, user],
  )

  return { updateProfile, busy, error, setError }
}

export type SendPhoneCodeInput = {
  phone: string
  name: string
  role: HarvestRole
  farmName?: string
  area?: string
}

export type VerifyPhoneCodeInput = {
  phone: string
  token: string
  name: string
  role: HarvestRole
  farmName?: string
  area?: string
}

export function usePhoneAuth() {
  const { refreshProfile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = useCallback(
    async (input: SendPhoneCodeInput): Promise<{ error: string | null; success: boolean; phone: string }> => {
      setError(null)
      const normalizedPhone = normalizeNigerianPhone(input.phone)
      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        const msg = 'Enter a valid phone number, including your country code.'
        setError(msg)
        return { error: msg, success: false, phone: normalizedPhone }
      }
      if (input.name.trim().length < 2) {
        const msg = 'Add your name so farmers know who they’re meeting.'
        setError(msg)
        return { error: msg, success: false, phone: normalizedPhone }
      }

      setBusy(true)
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: {
            shouldCreateUser: true,
            data: {
              display_name: input.name.trim(),
              role: input.role,
              farm_name: input.farmName?.trim() || null,
              default_area: input.area || 'Lekki',
            },
          },
        })
        setBusy(false)
        if (otpError) {
          const msg = explainAuthError(otpError.message)
          setError(msg)
          return { error: msg, success: false, phone: normalizedPhone }
        }
        return { error: null, success: true, phone: normalizedPhone }
      } catch {
        const msg = 'We couldn’t send a code right now. Check your connection and try again.'
        setError(msg)
        setBusy(false)
        return { error: msg, success: false, phone: normalizedPhone }
      }
    },
    [],
  )

  const verifyCode = useCallback(
    async (input: VerifyPhoneCodeInput): Promise<{ error: string | null; success: boolean; profile: Profile | null }> => {
      setError(null)
      if (!/^\d{6}$/.test(input.token.trim())) {
        const msg = 'Enter the 6-digit code sent to your phone.'
        setError(msg)
        return { error: msg, success: false, profile: null }
      }

      setBusy(true)
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          phone: input.phone,
          token: input.token.trim(),
          type: 'sms',
        })
        if (verifyError || !data.user) {
          const msg = explainAuthError(verifyError?.message ?? 'verification_failed')
          setError(msg)
          setBusy(false)
          return { error: msg, success: false, profile: null }
        }

        const profile: Profile = {
          id: data.user.id,
          display_name: input.name.trim() || String(data.user.user_metadata?.display_name ?? 'HarvestLink member'),
          phone: data.user.phone ?? input.phone,
          role: input.role,
          default_area: input.area || String(data.user.user_metadata?.default_area ?? 'Lekki'),
          farm_name: input.farmName?.trim() || null,
        }
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profile, { onConflict: 'id' })
        setBusy(false)

        if (profileError) {
          const msg = 'Your number is verified, but we couldn’t finish setting up your profile. Please try again.'
          setError(msg)
          return { error: msg, success: false, profile: null }
        }

        await mutate(['harvestlink-profile', data.user.id], profile, { revalidate: false })
        await refreshProfile(data.user.id)
        return { error: null, success: true, profile }
      } catch {
        const msg = 'We couldn’t complete phone verification. Please try again.'
        setError(msg)
        setBusy(false)
        return { error: msg, success: false, profile: null }
      }
    },
    [mutate, refreshProfile],
  )

  return { sendCode, verifyCode, busy, error, setError }
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
