/**
 * shopStore.ts — localStorage-backed store for pre-made purchasable pattern templates.
 *
 * Owner workflow:
 *   1. Generate a pattern via the normal upload → settings → preview flow.
 *   2. On the export page with ?admin=1 in the URL, click "Save to Shop".
 *   3. Fill in title, description, tags, price — template saved here.
 *   4. Repeat for each size variant of the same design.
 *   5. Templates appear immediately on /shop.
 *
 * Customers browse /shop, pick a template, choose a size, optionally add a
 * name/date, then go through the normal Stripe checkout → export flow.
 */

import { PatternData } from '@/types/pattern'
import seedData from '@/data/shopTemplates.json'

const KEY = 'easystitch_shop_v1'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShopVariant {
  id:          string          // uuid
  label:       string          // 'Baby (40×40)' | 'Throw (60×60)' | 'Full (80×80)'
  width:       number
  height:      number
  stitchStyle: string
  price:       number          // cents, e.g. 300 = $3
  patternData: PatternData
}

export interface ShopTemplate {
  id:                   string
  slug:                 string   // URL-safe: 'football-c2c-pattern'
  title:                string   // 'Football C2C Blanket'
  description:          string
  tags:                 string[] // ['football', 'sports', 'boy', 'C2C']
  category:             string   // 'sports' | 'animals' | 'holidays' | 'names' | 'other'
  thumbnail:            string   // data URL of a small preview image
  variants:             ShopVariant[]
  allowPersonalization: boolean  // whether name/date panel is offered
  published:            boolean
  createdAt:            number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Items baked into the build — visible to every visitor. */
const SEED: ShopTemplate[] = seedData as ShopTemplate[]

function loadLocal(): ShopTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ShopTemplate[]) : []
  } catch { return [] }
}

/**
 * Returns seed templates + any locally-staged ones (localStorage).
 * If a local item shares an ID with a seed item, the local version wins
 * (so admin edits override the shipped version until next deploy).
 */
function load(): ShopTemplate[] {
  const local   = loadLocal()
  const localIds = new Set(local.map(t => t.id))
  return [...SEED.filter(t => !localIds.has(t.id)), ...local]
}

function save(templates: ShopTemplate[]): void {
  if (typeof window === 'undefined') return
  // Only persist items that aren't unmodified seed templates,
  // to keep localStorage lean after export-and-commit cycles.
  const seedIds = new Set(SEED.map(t => t.id))
  const toStore = templates.filter(t => !seedIds.has(t.id))
  localStorage.setItem(KEY, JSON.stringify(toStore))
}

/**
 * Returns ALL current templates (seed + local) as a JSON string
 * suitable for replacing src/data/shopTemplates.json and committing.
 * Thumbnails are stripped to keep the file small; re-generated on load.
 */
export function exportLibraryJson(): string {
  const all = load()
  return JSON.stringify(all, null, 2)
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

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllTemplates(): ShopTemplate[] {
  return load()
}

export function getPublishedTemplates(): ShopTemplate[] {
  return load().filter(t => t.published)
}

export function getTemplateBySlug(slug: string): ShopTemplate | null {
  return load().find(t => t.slug === slug) ?? null
}

export function getTemplateById(id: string): ShopTemplate | null {
  return load().find(t => t.id === id) ?? null
}

/** Create a brand-new template with a single variant (the current pattern). */
export function createTemplate(input: {
  title:                string
  description:          string
  tags:                 string[]
  category:             string
  thumbnail:            string
  allowPersonalization: boolean
  variant: Omit<ShopVariant, 'id'>
}): ShopTemplate {
  const templates = load()
  const baseSlug  = slugify(input.title)

  // Ensure slug is unique
  let slug   = baseSlug
  let suffix = 1
  while (templates.some(t => t.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`
  }

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

  save([...templates, template])
  return template
}

/** Add a new size variant to an existing template. */
export function addVariant(templateId: string, variant: Omit<ShopVariant, 'id'>): boolean {
  const templates = load()
  const idx       = templates.findIndex(t => t.id === templateId)
  if (idx < 0) return false
  templates[idx].variants.push({ ...variant, id: uid() })
  save(templates)
  return true
}

export function updateTemplate(id: string, patch: Partial<Omit<ShopTemplate, 'id' | 'createdAt'>>): boolean {
  const templates = load()
  const idx       = templates.findIndex(t => t.id === id)
  if (idx < 0) return false
  templates[idx] = { ...templates[idx], ...patch }
  save(templates)
  return true
}

export function deleteTemplate(id: string): void {
  save(load().filter(t => t.id !== id))
}

export function deleteVariant(templateId: string, variantId: string): boolean {
  const templates = load()
  const idx       = templates.findIndex(t => t.id === templateId)
  if (idx < 0) return false
  templates[idx].variants = templates[idx].variants.filter(v => v.id !== variantId)
  save(templates)
  return true
}
