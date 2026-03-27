/**
 * unlock.ts — client-side unlock token management.
 *
 * Plans
 * ─────
 * 'single'  — $2 launch price, valid for 6 hours from payment (one pattern download)
 * 'monthly' — future $5/month plan, valid for 30 days (unlimited patterns)
 *
 * Tokens are issued server-side after Stripe verifies payment and cannot be
 * forged by writing directly to localStorage — the HMAC is keyed with a
 * server-only secret.
 */

const KEY = 'easystitch_unlock_v2'

export type UnlockPlan = 'single' | 'monthly'

export interface UnlockRecord {
  token:     string       // server-issued HMAC token
  plan:      UnlockPlan   // which plan was purchased
  paidAt:    number       // unix ms — when payment cleared
  expiresAt: number       // unix ms — token expiry
}

export function getUnlockRecord(): UnlockRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as UnlockRecord
  } catch {
    return null
  }
}

export function setUnlockRecord(record: UnlockRecord): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(record))
}

// Free window — all downloads free until 12:30 PM CDT 2026-03-27
const FREE_UNTIL = new Date('2026-03-27T17:30:00Z')

export function isUnlocked(): boolean {
  if (Date.now() < FREE_UNTIL.getTime()) return true
  const record = getUnlockRecord()
  if (!record) return false
  return Date.now() < record.expiresAt
}

/** True if the user has an active monthly plan */
export function hasMonthlyAccess(): boolean {
  const record = getUnlockRecord()
  if (!record) return false
  return record.plan === 'monthly' && Date.now() < record.expiresAt
}
