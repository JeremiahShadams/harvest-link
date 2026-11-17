'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { Bell, ChevronDown, CircleUserRound, LogOut, MapPin, Sprout, UserRoundPen } from 'lucide-react'
import { AppSidebar } from '@/components/harvestlink/app-sidebar'
import { AuthDialog } from '@/components/harvestlink/auth-dialog'
import { FarmerView } from '@/components/harvestlink/farmer-view'
import { MarketplaceView, OrderDialog } from '@/components/harvestlink/marketplace-view'
import { OrdersView } from '@/components/harvestlink/orders-view'
import { NotificationsView } from '@/components/harvestlink/notifications-view'
import { ProfileView } from '@/components/harvestlink/profile-view'
import { ScanView } from '@/components/harvestlink/scan-view'
import { createClient } from '@/lib/supabase/client'
import { LISTING_COLUMNS, PRODUCT_IMAGES, type AppSection, type HarvestNotification, type HarvestOrder, type HarvestRole, type Listing, type Profile, type ProduceScan, type ShelfLifeResult } from '@/lib/harvestlink/types'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

const areaOptions = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja', 'Surulere']

function friendlyOrderError(message: string) {
  const text = message.toLowerCase()
  if (text.includes('insufficient_stock')) return 'That harvest quantity changed. Choose a little less and try again.'
  if (text.includes('listing_unavailable')) return 'That harvest has just been picked up. Choose another listing.'
  if (text.includes('cannot_order_own')) return 'You can’t place an order on your own listing.'
  if (text.includes('buyer_profile_required')) return 'Switch your profile to Buyer or Both before placing an order.'
  if (text.includes('sample_listing_not_orderable')) return 'This is sample inventory and can’t be ordered.'
  if (text.includes('invalid_quantity')) return 'Choose a valid quantity that is available from this farm.'
  return 'We couldn’t place that order. Check your connection and try again.'
}

export function HarvestLinkApp() {
  const supabase = createClient()
  const { mutate } = useSWRConfig()
  const [section, setSection] = useState<AppSection>('shop')
  const [mode, setMode] = useState<'buyer' | 'farmer'>('buyer')
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState<HarvestRole>('buyer')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [deliveryArea, setDeliveryArea] = useState('Lekki')
  const [deliveryAreaBusy, setDeliveryAreaBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All produce')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [latestScan, setLatestScan] = useState<ShelfLifeResult | null>(null)
  const [scanReturnsToFarmer, setScanReturnsToFarmer] = useState(false)
  const [reportUrl, setReportUrl] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (active) setUser(data.user)
    })()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || session) setUser(session?.user ?? null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [supabase])

  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR<Profile | null>(user ? ['harvestlink-profile', user.id] : null, async () => {
    const { data, error } = await supabase.from('profiles').select('id,display_name,phone,role,default_area,farm_name').maybeSingle()
    if (error) throw error
    return (data as Profile | null) ?? null
  })

  useEffect(() => {
    if (profile?.default_area) setDeliveryArea(profile.default_area)
  }, [profile?.default_area])
  const { data: listings = [], isLoading: listingsLoading, error: listingsError } = useSWR<Listing[]>('harvestlink-listings', async () => {
    const { data, error } = await supabase.from('listings').select(LISTING_COLUMNS).eq('status', 'active').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Listing[]
  }, { revalidateOnFocus: true, refreshInterval: 45_000 })
  const { data: orders = [], isLoading: ordersLoading } = useSWR<HarvestOrder[]>(user ? ['harvestlink-orders', user.id] : null, async () => {
    const { data, error } = await supabase.from('orders').select('id,listing_id,buyer_id,farmer_id,quantity_kg,unit_price_per_kg,status,delivery_window,delivery_area,notes,rating,rating_note,created_at,listing:listings(crop,farm_name,image_url)').or(`buyer_id.eq.${user?.id},farmer_id.eq.${user?.id}`).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as HarvestOrder[]
  }, { revalidateOnFocus: true })
  const { data: farmerListings = [], isLoading: farmerListingsLoading } = useSWR<Listing[]>(user ? ['harvestlink-farmer-listings', user.id] : null, async () => {
    const { data, error } = await supabase.from('listings').select(LISTING_COLUMNS).eq('farmer_id', user!.id).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Listing[]
  }, { revalidateOnFocus: true })
  const { data: scans = [], isLoading: scansLoading } = useSWR<ProduceScan[]>(user ? ['harvestlink-scans', user.id] : null, async () => {
    const { data, error } = await supabase.from('produce_scans').select('id,user_id,crop,remaining_days,confidence,storage_tips,created_at').eq('user_id', user!.id).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ProduceScan[]
  })
  const { data: notifications = [], isLoading: notificationsLoading, error: notificationsError } = useSWR<HarvestNotification[]>(user ? ['harvestlink-notifications', user.id] : null, async () => {
    const { data, error } = await supabase.from('harvest_notifications').select('id,user_id,kind,title,message,order_id,listing_id,created_at,read_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return (data ?? []) as HarvestNotification[]
  }, { revalidateOnFocus: true, refreshInterval: 30_000 })

  const isFarmer = profile?.role === 'farmer' || profile?.role === 'both'
  const currentOrders = useMemo(() => orders.filter((order) => mode === 'buyer' ? order.buyer_id === user?.id : order.farmer_id === user?.id), [mode, orders, user?.id])
  const activeOrderCount = currentOrders.filter((order) => order.status !== 'delivered').length
  const unreadNotificationCount = notifications.reduce((count, notification) => count + (notification.read_at ? 0 : 1), 0)

  const navigate = useCallback((nextSection: AppSection) => {
    setSection(nextSection)
    setProfileMenuOpen(false)
    if (nextSection === 'shop') setMode('buyer')
    if (nextSection === 'farmer') setMode('farmer')
    if ((nextSection === 'scan' || nextSection === 'notifications' || nextSection === 'profile') && !user) {
      setAuthRole(mode === 'farmer' ? 'farmer' : 'buyer')
      setAuthOpen(true)
    }
  }, [mode, user])

  const switchMode = useCallback(async (nextMode: 'buyer' | 'farmer') => {
    setMode(nextMode)
    setSection(nextMode === 'farmer' ? 'farmer' : 'shop')
    if (!user) {
      setAuthRole(nextMode === 'farmer' ? 'farmer' : 'buyer')
      return
    }
    const profileRoleIncludesMode = nextMode === 'farmer' ? isFarmer : profile?.role === 'buyer' || profile?.role === 'both'
    if (profile && !profileRoleIncludesMode) {
      setActionBusy(true)
      const { error } = await supabase.from('profiles').update({ role: 'both' }).eq('id', user.id)
      setActionBusy(false)
      if (error) {
        setToast('Your profile role could not be updated right now.')
        return
      }
      await mutate(['harvestlink-profile', user.id])
    }
  }, [isFarmer, mutate, profile, supabase, user])

  const requireAuth = useCallback((role: HarvestRole = mode === 'farmer' ? 'farmer' : 'buyer') => {
    setAuthRole(role)
    setAuthOpen(true)
  }, [mode])

  const handleAuthComplete = useCallback(async (nextProfile: Profile) => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    await mutate(['harvestlink-profile', nextProfile.id], nextProfile)
    setDeliveryArea(nextProfile.default_area || 'Lekki')
    setAuthOpen(false)
    setMode(nextProfile.role === 'farmer' ? 'farmer' : 'buyer')
    setSection(nextProfile.role === 'farmer' && section !== 'notifications' && section !== 'profile' ? 'farmer' : section)
    setToast(`Welcome to HarvestLink, ${nextProfile.display_name.split(' ')[0]}.`)
  }, [mutate, section, supabase])

  const saveProfile = useCallback(async (fields: Pick<Profile, 'display_name' | 'role' | 'default_area' | 'farm_name'>) => {
    if (!user) return 'Sign in to update your profile.'
    setActionBusy(true)
    try {
      const { data, error } = await supabase.from('profiles').update({
        display_name: fields.display_name.trim(),
        role: fields.role,
        default_area: fields.default_area,
        farm_name: fields.farm_name?.trim() || null,
      }).eq('id', user.id).select('id,display_name,phone,role,default_area,farm_name').maybeSingle()
      if (error || !data) return 'Your profile could not be saved. Check your connection and try again.'
      const nextProfile = data as Profile
      await mutate(['harvestlink-profile', user.id], nextProfile)
      setDeliveryArea(nextProfile.default_area)
      if (nextProfile.role === 'farmer') setMode('farmer')
      if (nextProfile.role === 'buyer') setMode('buyer')
      setToast('Your profile and delivery area are saved.')
      return null
    } catch {
      return 'Your profile could not be saved. Check your connection and try again.'
    } finally {
      setActionBusy(false)
    }
  }, [mutate, supabase, user])

  const changeDeliveryArea = useCallback(async (nextArea: string) => {
    if (!user || !profile) {
      setDeliveryArea(nextArea)
      return
    }
    const previousArea = profile.default_area
    setDeliveryArea(nextArea)
    setDeliveryAreaBusy(true)
    const { error } = await supabase.from('profiles').update({ default_area: nextArea }).eq('id', user.id)
    setDeliveryAreaBusy(false)
    if (error) {
      setDeliveryArea(previousArea)
      setToast('Your delivery area could not be saved. Please try again.')
      return
    }
    await mutate(['harvestlink-profile', user.id], { ...profile, default_area: nextArea }, false)
  }, [mutate, profile, supabase, user])

  const placeOrder = useCallback(async (listing: Listing, quantity: number, windowValue: string, notes: string) => {
    if (!user) {
      requireAuth('buyer')
      return null
    }
    const { error } = await supabase.rpc('place_order', {
      p_listing_id: listing.id,
      p_quantity_kg: quantity,
      p_delivery_window: windowValue,
      p_delivery_area: deliveryArea,
      p_notes: notes,
    })
    if (error) return friendlyOrderError(error.message)
    await Promise.all([mutate(['harvestlink-orders', user.id]), mutate(['harvestlink-notifications', user.id]), mutate('harvestlink-listings'), mutate(['harvestlink-farmer-listings', listing.farmer_id])])
    setSection('orders')
    setMode('buyer')
    setToast('Your order is on its way to the farm.')
    return null
  }, [deliveryArea, mutate, requireAuth, supabase, user])

  const createListing = useCallback(async (input: { crop: string; category: string; price: number; quantity: number; shelfDays: number; farmName: string; area: string }) => {
    if (!user || !profile) return 'Sign in and finish your farmer profile before publishing a harvest.'
    const roleAllowed = profile.role === 'farmer' || profile.role === 'both'
    if (!roleAllowed) return 'Choose Farmer or Both in your profile before publishing a harvest.'
    const confidence = latestScan && latestScan.crop.toLowerCase() === input.crop.toLowerCase() ? latestScan.confidence : null
    const { error } = await supabase.from('listings').insert({
      farmer_id: user.id,
      farmer_name: profile.display_name,
      farm_name: input.farmName || profile.farm_name || 'Independent farm',
      crop: input.crop,
      category: input.category,
      price_per_kg: input.price,
      available_kg: input.quantity,
      harvested_on: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }),
      estimated_shelf_life_days: input.shelfDays,
      scan_confidence: confidence,
      image_url: PRODUCT_IMAGES[input.category] || PRODUCT_IMAGES.Other,
      area: input.area,
      is_demo: false,
    })
    if (error) return 'This harvest could not be published. Check the details and try again.'
    await Promise.all([mutate('harvestlink-listings'), mutate(['harvestlink-farmer-listings', user.id])])
    setToast('Your harvest is now in the market.')
    return null
  }, [latestScan, mutate, profile, supabase, user])

  const advanceOrder = useCallback(async (order: HarvestOrder, nextStatus: HarvestOrder['status']) => {
    if (!user) return
    const { error } = await supabase.rpc('advance_order_status', { p_order_id: order.id, p_next_status: nextStatus })
    if (error) {
      setToast('That order update could not be saved. Refresh and try again.')
      return
    }
    await mutate(['harvestlink-orders', user.id])
    setToast(`Order marked ${nextStatus.replaceAll('_', ' ')}.`)
  }, [mutate, supabase, user])

  const rateOrder = useCallback(async (order: HarvestOrder, rating: number, note: string) => {
    if (!user) return 'Sign in to rate a delivered order.'
    const { error } = await supabase.rpc('rate_delivered_order', {
      p_order_id: order.id,
      p_rating: rating,
      p_note: note,
    })
    if (error) {
      return error.message.includes('order_not_rateable')
        ? 'This order can no longer be rated. Refresh your orders and try again.'
        : 'We couldn’t save your rating. Please try again.'
    }
    await mutate(['harvestlink-orders', user.id])
    setToast('Thanks for sharing your feedback.')
    return null
  }, [mutate, supabase, user])

  const createReport = useCallback(async () => {
    if (!user) {
      requireAuth('farmer')
      return
    }
    setReportBusy(true)
    const { data, error } = await supabase.rpc('create_activity_report')
    setReportBusy(false)
    if (error || !data) {
      setToast(error?.message.includes('farmer_profile_required') ? 'Set up your farmer profile before creating a report.' : 'We couldn’t prepare that report. Try again in a moment.')
      return
    }
    setReportUrl(`${window.location.origin}/report/${data}`)
    setToast('Your private activity report is ready for you to share.')
  }, [requireAuth, supabase, user])

  const copyReport = useCallback(async () => {
    if (!reportUrl) return
    try {
      await navigator.clipboard.writeText(reportUrl)
      setToast('Report link copied to your clipboard.')
    } catch {
      setToast('Copy isn’t available here. Select the report link to copy it.')
    }
  }, [reportUrl])

  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!user) return
    const { error } = await supabase.from('harvest_notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('user_id', user.id).is('read_at', null)
    if (error) {
      setToast('This update could not be marked as read. Try again shortly.')
      return
    }
    await mutate(['harvestlink-notifications', user.id])
  }, [mutate, supabase, user])

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return
    const { error } = await supabase.from('harvest_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
    if (error) {
      setToast('Your updates could not be marked as read. Try again shortly.')
      return
    }
    await mutate(['harvestlink-notifications', user.id])
  }, [mutate, supabase, user])

  const refreshNotifications = useCallback(() => {
    if (user) void mutate(['harvestlink-notifications', user.id])
  }, [mutate, user])

  const openNotification = useCallback((notification: HarvestNotification) => {
    void markNotificationRead(notification.id)
    setProfileMenuOpen(false)
    if (notification.kind === 'short_shelf_life') {
      setScanReturnsToFarmer(false)
      setSection('scan')
      return
    }
    const relatedOrder = orders.find((order) => order.id === notification.order_id)
    const showFarmerOrders = relatedOrder ? relatedOrder.farmer_id === user?.id : profile?.role === 'farmer' || (profile?.role === 'both' && mode === 'farmer')
    setMode(showFarmerOrders ? 'farmer' : 'buyer')
    setSection('orders')
  }, [markNotificationRead, mode, orders, profile?.role, user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfileMenuOpen(false)
    setMode('buyer')
    setSection('shop')
    setToast('You’re signed out. The market is still open to browse.')
  }

  return (
    <div className="harvest-app">
      <AppSidebar activeSection={section} onNavigate={navigate} activeOrders={activeOrderCount} />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-location"><span className="location-icon"><MapPin aria-hidden="true" /></span><div className="location-select-wrap"><span>DELIVERING TO</span><select aria-label="Delivery area" value={deliveryArea} onChange={(event) => void changeDeliveryArea(event.target.value)} disabled={deliveryAreaBusy || (!!user && (profileLoading || !profile))}>{areaOptions.map((area) => <option key={area}>{area}</option>)}</select></div><ChevronDown className="location-chevron" aria-hidden="true" /></div>
          <div className="topbar-actions">
            <div className="mode-switch" role="group" aria-label="Choose your HarvestLink space"><button className={mode === 'buyer' ? 'is-active' : ''} onClick={() => switchMode('buyer')} disabled={actionBusy}>Buyer</button><button className={mode === 'farmer' ? 'is-active' : ''} onClick={() => switchMode('farmer')} disabled={actionBusy}>Farmer</button></div>
            <span className="topbar-divider" />
            <button className="icon-button notification-button" aria-label={unreadNotificationCount > 0 ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications'} aria-controls="notifications-panel" aria-current={section === 'notifications' ? 'page' : undefined} onClick={() => navigate('notifications')}><Bell aria-hidden="true" />{unreadNotificationCount > 0 && <span className="notification-unread-count" aria-hidden="true">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}</button>
            <div className="profile-menu-wrap"><button className={`profile-button${user ? ' has-user' : ''}`} onClick={() => user ? setProfileMenuOpen((open) => !open) : navigate('profile')} aria-label={user ? `Account for ${profile?.display_name || 'HarvestLink member'}` : 'Sign in with phone'} aria-expanded={profileMenuOpen}><span className="profile-avatar">{user ? (profile?.display_name || user.phone || 'H').slice(0, 1).toUpperCase() : <CircleUserRound aria-hidden="true" />}</span><span className="profile-button-copy"><strong>{user ? profile?.display_name?.split(' ')[0] || 'Welcome' : 'Sign in'}</strong><small>{user ? mode === 'farmer' ? 'Farmer account' : 'Buyer account' : 'Your account'}</small></span><ChevronDown aria-hidden="true" /></button>
              {profileMenuOpen && user && <div className="profile-menu"><div className="profile-menu-heading"><strong>{profile?.display_name || 'HarvestLink member'}</strong><span>{user.phone}</span></div><button className="profile-menu-action" onClick={() => navigate('profile')}><UserRoundPen aria-hidden="true" /> Profile &amp; location</button><button className="profile-menu-signout" onClick={() => void signOut()}><LogOut aria-hidden="true" /> Sign out</button></div>}
            </div>
          </div>
        </header>

        <main className="app-content">
          <section className="view-panel" hidden={section !== 'shop'}><MarketplaceView listings={listings} loading={listingsLoading} error={!!listingsError} search={query} onSearch={setQuery} category={category} onCategory={setCategory} deliveryArea={deliveryArea} onSelectListing={setSelectedListing} /></section>
          <section className="view-panel" hidden={section !== 'orders'}><OrdersView orders={orders} loading={ordersLoading} mode={mode} onAdvance={(order, nextStatus) => void advanceOrder(order, nextStatus)} onRate={rateOrder} onBrowse={() => navigate('shop')} signedIn={!!user} onSignIn={() => requireAuth()} /></section>
          <section className="view-panel" hidden={section !== 'notifications'}><NotificationsView notifications={notifications} loading={notificationsLoading} error={!!notificationsError} signedIn={!!user} busy={actionBusy} onMarkRead={(id) => void markNotificationRead(id)} onMarkAllRead={() => void markAllNotificationsRead()} onOpen={openNotification} onRefresh={refreshNotifications} onSignIn={() => requireAuth()} /></section>
          <section className="view-panel" hidden={section !== 'profile'}><ProfileView profile={profile ?? null} areas={areaOptions} loading={profileLoading} loadError={!!profileError} signedIn={!!user} busy={actionBusy} onSave={saveProfile} onSignIn={() => requireAuth()} onRetry={() => { if (user) void mutate(['harvestlink-profile', user.id]) }} /></section>
          <section className="view-panel" hidden={section !== 'scan'}><ScanView userId={user?.id ?? null} onRequireAuth={() => requireAuth()} onScanComplete={(result) => { setLatestScan(result); if (user) void mutate(['harvestlink-notifications', user.id]); if (scanReturnsToFarmer) { setSection('farmer'); setMode('farmer'); setScanReturnsToFarmer(false) } }} /></section>
          <section className="view-panel" hidden={section !== 'farmer'}><FarmerView profile={profile ?? null} listings={farmerListings} orders={orders.filter((order) => order.farmer_id === user?.id)} scans={scans} loading={profileLoading || farmerListingsLoading || scansLoading} signedIn={!!user} latestScan={latestScan} reportUrl={reportUrl} reportBusy={reportBusy} onSignIn={() => requireAuth('farmer')} onOpenScan={() => { if (!user) { requireAuth('farmer'); return } setScanReturnsToFarmer(true); setSection('scan') }} onCreateListing={createListing} onCreateReport={() => void createReport()} onCopyReport={() => void copyReport()} onModeChange={(nextMode) => void switchMode(nextMode)} /></section>
        </main>
      </div>

      <OrderDialog listing={selectedListing} onClose={() => setSelectedListing(null)} onOrder={placeOrder} requireAuth={() => requireAuth('buyer')} signedIn={!!user} />
      <AuthDialog open={authOpen} initialRole={authRole} onClose={() => setAuthOpen(false)} onComplete={(nextProfile) => void handleAuthComplete(nextProfile)} />
      {toast && <div className="app-toast" role="status"><Sprout aria-hidden="true" /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
    </div>
  )
}
