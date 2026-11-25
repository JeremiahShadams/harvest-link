import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { SWRConfig, useSWRConfig } from 'swr'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { loadDesignValue, saveDesignValue } from '@/lib/harvestlink/design-local'
import { translate, type AppLanguage, type TranslationKey } from '@/lib/harvestlink/i18n'
import { createPersistentCacheProvider } from '@/lib/harvestlink/swr-cache'
import { fetchProfile } from '@/lib/harvestlink/use-data'
import type { AppSpace, Profile, ShelfLifeResult } from '@/lib/harvestlink/types'

type HarvestLinkContextValue = {
  user: User | null
  profile: Profile | null
  authLoading: boolean
  profileError: string | null
  refreshProfile: (userId?: string) => Promise<Profile | null>
  latestScan: ShelfLifeResult | null
  setLatestScan: (scan: ShelfLifeResult | null) => void
  activeSpace: AppSpace
  setActiveSpace: (space: AppSpace) => void
  avatarUri: string | null
  setAvatarUri: (uri: string | null) => void
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => void
  t: (key: TranslationKey) => string
}

const HarvestLinkContext = createContext<HarvestLinkContextValue | null>(null)

function HarvestLinkInnerProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [latestScan, setLatestScan] = useState<ShelfLifeResult | null>(null)
  const [preferredSpace, setPreferredSpace] = useState<AppSpace>('buyer')
  const [avatarUri, setAvatarUriState] = useState<string | null>(null)
  const [language, setLanguageState] = useState<AppLanguage>('en')
  const requestId = useRef(0)
  const { mutate } = useSWRConfig()

  useEffect(() => {
    let active = true
    void loadDesignValue<AppSpace>('active-space', 'buyer').then((saved) => {
      if (active && (saved === 'buyer' || saved === 'farmer')) setPreferredSpace(saved)
    })
    void loadDesignValue<string | null>('profile-avatar', null).then((saved) => {
      if (active && typeof saved === 'string' && saved.trim()) setAvatarUriState(saved)
    })
    void loadDesignValue<AppLanguage>('app-language', 'en').then((saved) => {
      if (active && (saved === 'en' || saved === 'pcm')) setLanguageState(saved)
    })
    return () => { active = false }
  }, [])

  const setActiveSpace = useCallback((space: AppSpace) => {
    setPreferredSpace(space)
    void saveDesignValue('active-space', space)
  }, [])

  const setAvatarUri = useCallback((uri: string | null) => {
    setAvatarUriState(uri)
    void saveDesignValue('profile-avatar', uri)
  }, [])

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang)
    void saveDesignValue('app-language', lang)
  }, [])

  const activeSpace: AppSpace = useMemo(() => {
    if (profile?.role === 'farmer') return 'farmer'
    if (profile?.role === 'both') return preferredSpace
    return 'buyer'
  }, [preferredSpace, profile?.role])

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
      try {
        const data = await fetchProfile(nextUser.id)
        if (!active() || requestId.current !== id) return
        setProfile(data)
        setProfileError(null)
      } catch {
        if (!active() || requestId.current !== id) return
        setProfileError('Your profile could not be loaded. Check your connection and try again.')
        setProfile(null)
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

  const refreshProfile = useCallback(async (userId?: string) => {
    const targetId = userId ?? user?.id
    if (!targetId) return null
    try {
      const nextProfile = await fetchProfile(targetId)
      setProfile(nextProfile)
      setProfileError(null)
      return nextProfile
    } catch (error) {
      setProfileError('Your profile could not be loaded. Check your connection and try again.')
      throw error
    }
  }, [user])

  const t = useCallback((key: TranslationKey) => translate(language, key), [language])

  return (
    <HarvestLinkContext.Provider
      value={{
        user,
        profile,
        authLoading,
        profileError,
        refreshProfile,
        latestScan,
        setLatestScan,
        activeSpace,
        setActiveSpace,
        avatarUri,
        setAvatarUri,
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </HarvestLinkContext.Provider>
  )
}

export function HarvestLinkProvider({ children }: PropsWithChildren) {
  const provider = useMemo(() => createPersistentCacheProvider(), [])
  return (
    <SWRConfig value={{ provider }}>
      <HarvestLinkInnerProvider>{children}</HarvestLinkInnerProvider>
    </SWRConfig>
  )
}

export function useHarvestLink() {
  const value = useContext(HarvestLinkContext)
  if (!value) throw new Error('useHarvestLink must be used within HarvestLinkProvider.')
  return value
}
