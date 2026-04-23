/**
 * shopStore.ts — localStorage-backed store for pre-made purchasable pattern templates.
 *
 * Owner workflow:
 *   1. Generate a pattern via the normal upload → settings → preview flow.
 *   2. Visit /create?admin=1, upload, go to preview, click "Save to Shop (admin)".
 *   3. Fill in title, description, tags, price — template saved to localStorage.
 *   4. Repeat for each pattern/variant.
 *   5. Click "Export Library JSON" → download file → replace public/shopTemplates.json → push.
 *   6. On deploy the JSON is served from /public and fetched by the shop page.
 *
 * Architecture:
 *   - Seed data lives in /public/shopTemplates.json (served as a static asset, NOT bundled).
 *   - New/staged patterns live in localStorage until exported and committed.
 *   - fetchPublishedTemplates() / fetchTemplateBySlug() merge both sources async.
 *   - createTemplate / addVariant / save operate on localStorage synchronously.
 */

import { PatternData } from '@/types/pattern'

const KEY = 'easystitch_shop_v1'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShopVariant {
  id:          string
  label:       string
  width:       number
  height:      number
  stitchStyle: string
  price:       number       // cents
  patternData: PatternData
}

export interface ShopTemplate {
  id:                   string
  slug:                 string
  title:                string
  description:          string
  tags:                 string[]
  category:             string
  thumbnail:            string
  variants:             ShopVariant[]
  allowPersonalization: boolean
  published:            boolean
  createdAt:            number
}

// ── Seed fetch (public/shopTemplates.json — NOT bundled) ──────────────────────

let _seedCache: ShopTemplate[] | null = null

async function fetchSeed(): Promise<ShopTemplate[]> {
  if (_seedCache !== null) return _seedCache
  if (typeof window === 'undefined') return []
  try {
    const res = await fetch('/shopTemplates.json', { cache: 'force-cache' })
    if (!res.ok) { _seedCache = []; return [] }
    _seedCache = await res.json()
    return _seedCache!
  } catch { _seedCache = []; return [] }
}

// ── localStorage helpers ──────────────────────────────────────────────────────

export function loadLocal(): ShopTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ShopTemplate[]) : []
  } catch { return [] }
}

function save(templates: ShopTemplate[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(templates))
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Async public API (seed + localStorage merged) ────────────────────────────

/** Merge seed file + localStorage. localStorage wins on ID collision. */
async function fetchAll(): Promise<ShopTemplate[]> {
  const [seed, local] = await Promise.all([fetchSeed(), Promise.resolve(loadLocal())])
  const localIds = new Set(local.map(t => t.id))
  return [...seed.filter(t => !localIds.has(t.id)), ...local]
}

export async function fetchPublishedTemplates(): Promise<ShopTemplate[]> {
  return (await fetchAll()).filter(t => t.published)
}

export async function fetchTemplateBySlug(slug: string): Promise<ShopTemplate | null> {
  return (await fetchAll()).find(t => t.slug === slug) ?? null
}

export async function fetchTemplateById(id: string): Promise<ShopTemplate | null> {
  return (await fetchAll()).find(t => t.id === id) ?? null
}

// ── Sync API (localStorage only — used by admin dropdowns) ───────────────────

/** Returns only locally-staged templates (admin use only). */
export function getAllTemplates(): ShopTemplate[] {
  return loadLocal()
}

// ── Export helper ─────────────────────────────────────────────────────────────

/**
 * Downloads ALL templates (seed + local) as shopTemplates.json.
 * Replace public/shopTemplates.json with this file and push to deploy.
 */
export async function exportLibraryJson(): Promise<string> {
  const all = await fetchAll()
  return JSON.stringify(all, null, 2)
}

// ── Write operations (localStorage) ──────────────────────────────────────────

export function createTemplate(input: {
  title:                string
  description:          string
  tags:                 string[]
  category:             string
  thumbnail:            string
  allowPersonalization: boolean
  variant: Omit<ShopVariant, 'id'>
}): ShopTemplate {
  const local    = loadLocal()
  const baseSlug = slugify(input.title)
  let slug       = baseSlug
  let suffix     = 1
  while (local.some(t => t.slug === slug)) slug = `${baseSlug}-${suffix++}`

  const template: ShopTemplate = {
    id:                   uid(),
    slug,
    title:                input.title,
    description:          input.description,
    tags:                 input.tags,
    category:             input.category,
    thumbnail:            input.thumbnail,
    allowPersonalization: input.allowPersonalization,
    published:            true,
    createdAt:            Date.now(),
    variants:             [{ ...input.variant, id: uid() }],
  }
  save([...local, template])
  return template
}

export function addVariant(templateId: string, variant: Omit<ShopVariant, 'id'>): boolean {
  const local = loadLocal()
  const idx   = local.findIndex(t => t.id === templateId)
  if (idx < 0) return false
  local[idx].variants.push({ ...variant, id: uid() })
  save(local)
  return true
}

export function updateTemplate(id: string, patch: Partial<Omit<ShopTemplate, 'id' | 'createdAt'>>): boolean {
  const local = loadLocal()
  const idx   = local.findIndex(t => t.id === id)
  if (idx < 0) return false
  local[idx] = { ...local[idx], ...patch }
  save(local)
  return true
}

export function deleteTemplate(id: string): void {
  save(loadLocal().filter(t => t.id !== id))
}

export function deleteVariant(templateId: string, variantId: string): boolean {
  const local = loadLocal()
  const idx   = local.findIndex(t => t.id === templateId)
  if (idx < 0) return false
  local[idx].variants = local[idx].variants.filter(v => v.id !== variantId)
  save(local)
  return true
}
