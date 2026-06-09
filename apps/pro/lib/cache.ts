import AsyncStorage from '@react-native-async-storage/async-storage'

type CacheEntry = {
  data: any
  timestamp: number
}

type CacheListener = () => void

class CacheManager {
  private memoryCache = new Map<string, CacheEntry>()
  private listeners = new Map<string, Set<CacheListener>>()

  // Set memory cache
  set(key: string, data: any) {
    this.memoryCache.set(key, { data, timestamp: Date.now() })
    this.notify(key)
  }

  // Get memory cache
  get(key: string): any | null {
    const entry = this.memoryCache.get(key)
    return entry ? entry.data : null
  }

  // Get timestamp
  getTimestamp(key: string): number {
    const entry = this.memoryCache.get(key)
    return entry ? entry.timestamp : 0
  }

  // Check if cache exists
  has(key: string): boolean {
    return this.memoryCache.has(key)
  }

  // Invalidate cache
  invalidate(key: string) {
    this.memoryCache.delete(key)
    this.notify(key)
  }

  // Clear all caches
  clearAll() {
    this.memoryCache.clear()
    for (const key of this.listeners.keys()) {
      this.notify(key)
    }
  }

  // Pub/Sub
  subscribe(key: string, listener: CacheListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)
    return () => {
      this.listeners.get(key)?.delete(listener)
    }
  }

  private notify(key: string) {
    const set = this.listeners.get(key)
    if (set) {
      set.forEach(cb => cb())
    }
  }

  // Persistent cache support (AsyncStorage)
  async saveToDisk(key: string, data: any) {
    try {
      const entry: CacheEntry = { data, timestamp: Date.now() }
      await AsyncStorage.setItem(`musa_cache_${key}`, JSON.stringify(entry))
      this.set(key, data)
    } catch (e) {
      console.error(`[CacheManager saveToDisk] Error saving key ${key}:`, e)
    }
  }

  async loadFromDisk(key: string): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(`musa_cache_${key}`)
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw)
        this.memoryCache.set(key, entry)
        return entry.data
      }
    } catch (e) {
      console.error(`[CacheManager loadFromDisk] Error loading key ${key}:`, e)
    }
    return null
  }

  async removeFromDisk(key: string) {
    try {
      await AsyncStorage.removeItem(`musa_cache_${key}`)
      this.invalidate(key)
    } catch (e) {
      console.error(`[CacheManager removeFromDisk] Error removing key ${key}:`, e)
    }
  }
}

export const cacheManager = new CacheManager()
