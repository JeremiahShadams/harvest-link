import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { createClient, type SupportedStorage } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

const supabaseUrl = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

const authStorage: SupportedStorage = {
  async getItem(key) {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(key)
    if (typeof window === 'undefined') return null
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  async setItem(key, value) {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(key, value)
      return
    }
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      return
    }
  },
  async removeItem(key) {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(key)
      return
    }
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      return
    }
  },
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('HarvestLink needs a Supabase project URL and publishable key.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export function getApiBaseUrl() {
  const configured = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl
  if (configured) return configured.replace(/\/$/, '')
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin
  return ''
}
