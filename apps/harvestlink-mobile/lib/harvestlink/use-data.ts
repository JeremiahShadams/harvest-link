import { useMemo } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import {
  LISTING_COLUMNS,
  LISTING_SUMMARY_COLUMNS,
  NOTIFICATION_COLUMNS,
  ORDER_COLUMNS,
  PROFILE_COLUMNS,
  RPCS,
  SCAN_COLUMNS,
} from './types'
import type {
  HarvestNotification,
  HarvestOrder,
  Listing,
  OrderContact,
  Profile,
  ProduceScan,
} from './types'

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

export function useProfile(userId: string | null) {
  return useSWR<Profile | null>(
    userId ? ['harvestlink-profile', userId] : null,
    () => fetchProfile(userId as string),
    { revalidateOnFocus: true },
  )
}

export function useListings() {
  return useSWR<Listing[]>(
    'harvestlink-listings',
    async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_COLUMNS)
        .eq('status', 'active')
        .eq('is_demo', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Listing[]
    },
    { revalidateOnFocus: true, refreshInterval: 45_000 },
  )
}

export function useOrders(userId: string | null) {
  const key = userId ? ['harvestlink-orders', userId] : null
  return useSWR<HarvestOrder[]>(
    key,
    async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .or(`buyer_id.eq.${userId},farmer_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as unknown as HarvestOrder[]
      if (!rows.length) return []

      const listingIds = [...new Set(rows.map((order) => order.listing_id))]
      const { data: listings, error: listingError } = await supabase
        .from('listings')
        .select(LISTING_SUMMARY_COLUMNS)
        .in('id', listingIds)
      if (listingError) throw listingError
      const byId = new Map((listings ?? []).map((listing) => [listing.id, listing]))

      // Best-effort counterparty contact lookup via RPC (gracefully absent before migration runs).
      const contactMap = new Map<string, OrderContact>()
      try {
        const orderIds = rows.map((order) => order.id)
        const { data: contacts } = await supabase.rpc(RPCS.getOrderContacts, { p_order_ids: orderIds })
        if (Array.isArray(contacts)) {
          for (const contact of contacts as OrderContact[]) {
            contactMap.set(contact.order_id, contact)
          }
        }
      } catch {
        // Optional RPC not deployed yet; keep orders functional without contact info.
      }

      return rows.map((order) => ({
        ...order,
        unit: order.unit || byId.get(order.listing_id)?.unit || 'kg',
        listing: byId.get(order.listing_id) ?? null,
        contact: contactMap.get(order.id) ?? null,
      }))
    },
    { revalidateOnFocus: true, refreshInterval: 30_000 },
  )
}

export function useFarmerListings(userId: string | null) {
  return useSWR<Listing[]>(
    userId ? ['harvestlink-farmer-listings', userId] : null,
    async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_COLUMNS)
        .eq('farmer_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Listing[]
    },
    { revalidateOnFocus: true },
  )
}

export function useScans(userId: string | null) {
  return useSWR<ProduceScan[]>(userId ? ['harvestlink-scans', userId] : null, async () => {
    const { data, error } = await supabase
      .from('produce_scans')
      .select(SCAN_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as unknown as ProduceScan[]
  })
}

export function useNotifications(userId: string | null) {
  return useSWR<HarvestNotification[]>(
    userId ? ['harvestlink-notifications', userId] : null,
    async () => {
      const { data, error } = await supabase
        .from('harvest_notifications')
        .select(NOTIFICATION_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as unknown as HarvestNotification[]
    },
    { revalidateOnFocus: true, refreshInterval: 30_000 },
  )
}

export function useUnreadCount(notifications: HarvestNotification[] | undefined) {
  return useMemo(() => (notifications ?? []).filter((notification) => !notification.read_at).length, [notifications])
}

export {
  usePlaceOrder,
  useAdvanceOrder,
  useRateOrder,
  useCreateListing,
  useUpdateListing,
  useDeleteListing,
  useUpdateProfile,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useSaveScan,
  useAnalyzeScan,
  useSignOut,
  usePhoneAuth,
  useActivityReport,
  uploadListingPhoto,
  explainAuthError,
  friendlyOrderError,
  type PlaceOrderInput,
  type CreateListingInput,
  type UpdateListingInput,
  type UpdateProfileInput,
  type CompleteOnboardingInput,
  type SelectedScanPhoto,
} from './use-mutations'
