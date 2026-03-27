/**
 * Minimal event logger — logs to console AND sends to Vercel Analytics.
 * Usage: logEvent('EVENT_NAME', 'optional-detail')
 */
import { track } from '@vercel/analytics'

export function logEvent(name: string, detail?: string) {
  if (process.env.NODE_ENV !== 'production') {
    const ts = new Date().toISOString()
    console.log(`[${name}] - ${ts}${detail ? ` | ${detail}` : ''}`)
  }
  try {
    track(name, detail ? { detail } : undefined)
  } catch {
    // analytics unavailable (dev, ad-blocker) — fail silently
  }
}
