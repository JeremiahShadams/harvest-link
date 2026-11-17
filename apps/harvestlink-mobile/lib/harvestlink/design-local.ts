import * as SecureStore from 'expo-secure-store'

/**
 * Local-only storage for design fields that have no backend column yet.
 * These values never masquerade as production data; the final report lists the gaps.
 */
const prefix = 'harvestlink-design-'

export async function saveDesignValue<T>(key: string, value: T) {
  try {
    await SecureStore.setItemAsync(prefix + key, JSON.stringify(value))
  } catch {
    // Local persistence is best-effort; the in-memory state still works.
  }
}

export async function loadDesignValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await SecureStore.getItemAsync(prefix + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
