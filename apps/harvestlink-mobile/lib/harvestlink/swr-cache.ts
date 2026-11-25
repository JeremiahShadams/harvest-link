import { File, Paths } from 'expo-file-system'
import { Platform } from 'react-native'
import type { State } from 'swr'

const CACHE_FILENAME = 'harvestlink-swr-cache-v1.json'
const WEB_STORAGE_KEY = 'harvestlink-swr-cache-v1'
const MAX_PERSISTED_ENTRIES = 40

type SerializedEntry = [string, State<unknown, unknown>]

function readPersistedEntries(): SerializedEntry[] {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return []
      const raw = window.localStorage.getItem(WEB_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as SerializedEntry[]) : []
    }
    const file = new File(Paths.document, CACHE_FILENAME)
    if (!file.exists) return []
    const raw = file.textSync()
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as SerializedEntry[]) : []
  } catch {
    return []
  }
}

function writePersistedEntries(entries: SerializedEntry[]) {
  try {
    const safeEntries = entries
      .filter(([key, value]) => {
        if (!key.includes('harvestlink-')) return false
        return value && typeof value === 'object' && 'data' in value && value.data !== undefined
      })
      .slice(0, MAX_PERSISTED_ENTRIES)
    const payload = JSON.stringify(safeEntries)
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(WEB_STORAGE_KEY, payload)
      return
    }
    const file = new File(Paths.document, CACHE_FILENAME)
    if (!file.exists) {
      file.create({ intermediates: true, overwrite: true })
    }
    file.writeSync(payload)
  } catch {
    // Offline persistence is best-effort and must never interrupt renders.
  }
}

/**
 * Persists SWR query data on-device via expo-file-system so farmers and buyers
 * on weak farm-gate or Lagos 3G networks immediately see cached listings, orders,
 * and profiles on cold launch while SWR revalidates in the background.
 */
export function createPersistentCacheProvider() {
  const map = new Map<string, State<unknown, unknown>>(readPersistedEntries())
  let timer: ReturnType<typeof setTimeout> | null = null

  const scheduleFlush = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      writePersistedEntries(Array.from(map.entries()))
    }, 450)
  }

  return () => {
    return {
      get: (key: string) => map.get(key),
      set: (key: string, value: State<unknown, unknown>) => {
        map.set(key, value)
        if (key.includes('harvestlink-') && value?.data !== undefined) {
          scheduleFlush()
        }
      },
      delete: (key: string) => {
        const deleted = map.delete(key)
        if (deleted) scheduleFlush()
        return deleted
      },
      keys: () => map.keys(),
    }
  }
}
