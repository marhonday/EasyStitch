/**
 * storage.ts
 *
 * Safe localStorage wrapper that never throws.
 * iOS Safari in Private Browsing mode blocks localStorage entirely —
 * without this wrapper, any storage call crashes silently and the user
 * loses their project with no error shown.
 *
 * Falls back to an in-memory Map for the session when storage is unavailable.
 * Users get a warning banner so they know saves won't persist.
 */

// In-memory fallback for when localStorage is unavailable
const memStore = new Map<string, string>()
let storageAvailable: boolean | null = null

function checkStorageAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable
  try {
    const testKey = '__easystitch_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    storageAvailable = true
  } catch {
    storageAvailable = false
  }
  return storageAvailable
}

export function storageGet(key: string): string | null {
  try {
    if (checkStorageAvailable()) return localStorage.getItem(key)
    return memStore.get(key) ?? null
  } catch { return memStore.get(key) ?? null }
}

export function storageSet(key: string, value: string): void {
  try {
    if (checkStorageAvailable()) localStorage.setItem(key, value)
    else memStore.set(key, value)
  } catch { memStore.set(key, value) }
}

export function storageRemove(key: string): void {
  try {
    if (checkStorageAvailable()) localStorage.removeItem(key)
    else memStore.delete(key)
  } catch { memStore.delete(key) }
}

/** Returns true if we're using real localStorage (saves will persist). */
export function storageIsPersistent(): boolean {
  return checkStorageAvailable()
}
