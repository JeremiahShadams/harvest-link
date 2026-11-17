import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useSWRConfig } from 'swr'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, ShelfLifeResult } from '@/lib/harvestlink/types'

type HarvestLinkContextValue = {
  user: User | null
  profile: Profile | null
  authLoading: boolean
  profileError: string | null
  refreshProfile: () => Promise<Profile | null>
  latestScan: ShelfLifeResult | null
  setLatestScan: (scan: ShelfLifeResult | null) => void
}

const HarvestLinkContext = createContext<HarvestLinkContextValue | null>(null)

export function HarvestLinkProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [latestScan, setLatestScan] = useState<ShelfLifeResult | null>(null)
  const requestId = useRef(0)
  const { mutate } = useSWRConfig()

  const syncSession = useCallback((session: Session | null, active: () => boolean) => {
    const id = ++requestId.current
    const nextUser = session?.user ?? null
    setUser(nextUser)
    setProfileError(null)

    if (!nextUser) {
      setProfile(null)
      setAuthLoading(false)
      return
    }

    setAuthLoading(true)
    void Promise.resolve().then(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,phone,role,default_area,farm_name')
        .eq('id', nextUser.id)
        .maybeSingle()
      if (!active() || requestId.current !== id) return
      if (error) {
        setProfileError('Your profile could not be loaded. Check your connection and try again.')
        setProfile(null)
      } else {
        setProfile((data as Profile | null) ?? null)
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    let active = true
    const isActive = () => active
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session, isActive)
    })
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) syncSession(session, isActive)
    }).catch(() => {
      if (active) {
        setProfileError('We could not restore your sign-in. Please try again.')
        setAuthLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
      requestId.current += 1
    }
  }, [syncSession])

  useEffect(() => {
    if (!user) return
    const ordersChannel = supabase
      .channel(`mobile-orders-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` }, () => {
        void mutate(['harvestlink-orders', user.id])
        void mutate(['harvestlink-notifications', user.id])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `farmer_id=eq.${user.id}` }, () => {
        void mutate(['harvestlink-orders', user.id])
        void mutate(['harvestlink-notifications', user.id])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'harvest_notifications', filter: `user_id=eq.${user.id}` }, () => {
        void mutate(['harvestlink-notifications', user.id])
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(ordersChannel)
    }
  }, [mutate, user])

  const refreshProfile = useCallback(async () => {
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,phone,role,default_area,farm_name')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      setProfileError('Your profile could not be loaded. Check your connection and try again.')
      throw error
    }
    const nextProfile = (data as Profile | null) ?? null
    setProfile(nextProfile)
    setProfileError(null)
    return nextProfile
  }, [user])

  return (
    <HarvestLinkContext.Provider value={{ user, profile, authLoading, profileError, refreshProfile, latestScan, setLatestScan }}>
      {children}
    </HarvestLinkContext.Provider>
  )
}

export function useHarvestLink() {
  const value = useContext(HarvestLinkContext)
  if (!value) throw new Error('useHarvestLink must be used within HarvestLinkProvider.')
  return value
}
