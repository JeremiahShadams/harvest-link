import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Local-only storage for on-device preferences and unsubmitted drafts.
 * Note: Web builds fall back to localStorage cleanly.
 */
const prefix = 'harvestlink-design-'

export async function saveDesignValue<T>(key: string, value: T) {
  try {
    const serialized = JSON.stringify(value)
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(prefix + key, serialized)
      return
    }
    await SecureStore.setItemAsync(prefix + key, serialized)
  } catch {
    // Local persistence is best-effort; in-memory state still works.
  }
}

export async function loadDesignValue<T>(key: string, fallback: T): Promise<T> {
  try {
    let raw: string | null = null
    if (Platform.OS === 'web') {
      raw = typeof window !== 'undefined' ? window.localStorage.getItem(prefix + key) : null
    } else {
      raw = await SecureStore.getItemAsync(prefix + key)
    }
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export async function clearDesignValue(key: string) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(prefix + key)
      return
    }
    await SecureStore.deleteItemAsync(prefix + key)
  } catch {
    // Best-effort removal.
  }
}
