/**
 * Minimal event logger.
 * To remove all logging: delete this file and remove the imports/calls below.
 *
 * Usage: logEvent('EVENT_NAME')  →  [EVENT_NAME] - 2026-03-25T14:32:01.123Z
 */
export function logEvent(name: string, detail?: string) {
  const ts = new Date().toISOString()
  console.log(`[${name}] - ${ts}${detail ? ` | ${detail}` : ''}`)
}
