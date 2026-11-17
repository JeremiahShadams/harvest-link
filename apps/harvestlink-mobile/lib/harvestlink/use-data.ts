import { useMemo } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { LISTING_COLUMNS } from './types'
import type { HarvestNotification, HarvestOrder, Listing, ProduceScan } from './types'

const orderColumns = 'id,listing_id,buyer_id,farmer_id,quantity_kg,unit_price_per_kg,status,delivery_window,delivery_area,notes,rating,rating_note,created_at'

export function useListings() {
  return useSWR<Listing[]>('harvestlink-listings', async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .eq('status', 'active')
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as Listing[]
  }, { revalidateOnFocus: true, refreshInterval: 45_000 })
}

export function useOrders(userId: string | null) {
  const key = userId ? ['harvestlink-orders', userId] : null
  return useSWR<HarvestOrder[]>(key, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(orderColumns)
      .or(`buyer_id.eq.${userId},farmer_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = (data ?? []) as unknown as HarvestOrder[]
    if (!rows.length) return []
    const listingIds = [...new Set(rows.map((order) => order.listing_id))]
    const { data: listings, error: listingError } = await supabase
      .from('listings')
      .select('id,crop,farm_name,image_url,category')
      .in('id', listingIds)
    if (listingError) throw listingError
    const byId = new Map((listings ?? []).map((listing) => [listing.id, listing]))
    return rows.map((order) => ({ ...order, listing: byId.get(order.listing_id) ?? null }))
  }, { revalidateOnFocus: true, refreshInterval: 30_000 })
}

export function useFarmerListings(userId: string | null) {
  return useSWR<Listing[]>(userId ? ['harvestlink-farmer-listings', userId] : null, async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as Listing[]
  }, { revalidateOnFocus: true })
}

export function useScans(userId: string | null) {
  return useSWR<ProduceScan[]>(userId ? ['harvestlink-scans', userId] : null, async () => {
    const { data, error } = await supabase
      .from('produce_scans')
      .select('id,user_id,crop,remaining_days,confidence,storage_tips,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as unknown as ProduceScan[]
  })
}

export function useNotifications(userId: string | null) {
  return useSWR<HarvestNotification[]>(userId ? ['harvestlink-notifications', userId] : null, async () => {
    const { data, error } = await supabase
      .from('harvest_notifications')
      .select('id,user_id,kind,title,message,order_id,listing_id,created_at,read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []) as unknown as HarvestNotification[]
  }, { revalidateOnFocus: true, refreshInterval: 30_000 })
}

export function useUnreadCount(notifications: HarvestNotification[] | undefined) {
  return useMemo(() => (notifications ?? []).filter((notification) => !notification.read_at).length, [notifications])
}
