/**
 * useRowProgress
 *
 * Manages row-by-row progress with automatic localStorage persistence.
 * Progress is keyed to the pattern so different patterns don't collide.
 * On first render the hook rehydrates from storage — the user can close
 * the browser, return later on the same device, and pick up exactly where
 * they left off.
 */
import { useState, useEffect, useCallback } from 'react'

const STORAGE_PREFIX = 'esi_progress_'

interface RowProgressResult {
  completedRows:  Set<number>
  toggleRow:      (rowNumber: number) => void
  resetProgress:  () => void
  /** true once the initial localStorage read is done (avoids hydration flicker) */
  hydrated:       boolean
}

export function useRowProgress(patternKey: string): RowProgressResult {
  const storageKey = STORAGE_PREFIX + patternKey

  const [hydrated,      setHydrated]      = useState(false)
  const [completedRows, setCompletedRows] = useState<Set<number>>(new Set())

  // ── Rehydrate from localStorage on mount / key change ─────────────────
  useEffect(() => {
    if (!patternKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const rows = JSON.parse(raw) as number[]
        setCompletedRows(new Set(rows))
      } else {
        setCompletedRows(new Set())
      }
    } catch {
      setCompletedRows(new Set())
    }
    setHydrated(true)
  }, [storageKey, patternKey])

  // ── Auto-save on every change ──────────────────────────────────────────
  useEffect(() => {
    if (!patternKey || !hydrated) return
    try {
      if (completedRows.size === 0) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify([...completedRows]))
      }
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [completedRows, storageKey, patternKey, hydrated])

  const toggleRow = useCallback((rowNumber: number) => {
    setCompletedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    setCompletedRows(new Set())
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }, [storageKey])

  return { completedRows, toggleRow, resetProgress, hydrated }
}
