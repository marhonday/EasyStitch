# CraftWabi — Project Brief

## What this is
Next.js 14 App Router app. Crochet/stitch pattern tool with:
- Photo → stitch pattern converter (free)
- Pre-made pattern shop ($2/download via Stripe)
- Row-by-row progress tracker (free)
- Paint by Number ($1)

Live at: **craftwabi.com** (was easystitch.org — 301 redirect in place)
Repo: github.com/marhonday/EasyStitch
Deploy: Vercel (auto-deploys on push to main)

## Tech stack
- Next.js 14 App Router, TypeScript, all inline styles (no Tailwind)
- Stripe for payments (unitAmount = 200 = $2)
- Formspree (ID: mykbzdae) for feedback/email
- Fonts: Playfair Display (headings), DM Sans (body)
- Brand colors: cream bg #FAF6EF, rust #C4614A, dark brown #2C2218

## Key routes
- `/` — landing page (4 path cards)
- `/create` — photo upload + style guide (old home)
- `/upload` → `/settings` → `/preview` → `/export` — conversion flow
- `/shop` — pattern store (grid, filters, stacked cards)
- `/shop/[slug]` — product detail + colour customiser + personalization
- `/unlock` → Stripe → `/unlock/success` — paywall flow
- `/track/upload`, `/track/[id]` — progress tracker
- `/pbn` — paint by number

## Settings page
- Stitch style is **read-only** on settings — locked from upload/style-picker page, shown as a small pill label
- Colour count uses three tier pills: Beginner (2–6, default 4), Intermediate (7–12, default 8), Advanced (13–30, default 15)
- Selecting a tier snaps the slider to the tier's default; slider adjusts within the tier range
- Everything else unchanged: image type, grid size, background colour, border layers

## Shop system
- `public/shopTemplates.json` — full pattern data (~5.5MB, loaded on detail page only)
- `public/shopIndex.json` — metadata only, no grids (~180KB, loaded on listing page)
- `src/lib/shopStore.ts` — fetch functions, localStorage (`easystitch_shop_v1`) for staging
- Currently **21 patterns**: sports (basketball×5, football, baseball×2, soccer), hunting (doe, mallard), dogs (lab, yellow lab, rottweiler×3, labrador×2, corgi×3, poodle, dog-1×2, french bulldog), geometry×8
- Admin workflow:
  1. Navigate to `/create?admin=1` (sets `cw_admin=1` in sessionStorage)
  2. Upload → settings → preview → "🛍 Save to Shop (admin)" button
  3. Fill title/tags/category/size label → "Save to Shop Library"
  4. Repeat for each pattern/variant
  5. "Export Library JSON" button downloads both files (merges deployed seed + localStorage)
  6. @ both files in Claude Code → replace `/public/` files → git commit → push
- **Before starting a new batch**: run `localStorage.removeItem('easystitch_shop_v1')` in console to clear old deployed patterns so export stays clean
- Patterns saved with colour overrides baked in (activePalette used, not raw)
- If quota error on save: run `localStorage.removeItem('easystitch_shop_v1')` in browser console

## Paywall / unlock
- `src/lib/unlock.ts` — isUnlocked() checks localStorage token
- Export page: `if (!isUnlocked() && !isAdmin)` guards PDF/PNG download
- `isAdmin` persists via sessionStorage (`cw_admin=1`), set by `?admin=1` on any page
- Stripe webhook at `/api/checkout/route.ts`

## Progress tracker (`/track/[id]`)
- Full-width layout via `className="project-page"` (overrides app-shell max-width)
- FaithFooter suppressed on `/track/[id]` routes via `usePathname()` check
- Canvas fills left panel via ResizeObserver + `getBoundingClientRect().width`
- C2C mode: highlights true 45° diagonal (all cells where row+col === currentStep), fades completed diagonals cell-by-cell
- Yarn labels: editable names per colour, persisted to localStorage via `updateYarnLabel()` in patternTracker.ts
- Right panel shows 5-item diagonal window (currentStep ±2) with jump-to input and "See all" toggle
- `defaultYarnLabel(i)` returns "Color A", "Color B", etc.

## Image generation (for shop patterns)
Universal prompt prefix for flat pixel-friendly images:
> "Flat vector illustration, bold geometric shapes, solid fill colors only,
> no gradients no shading no shadows, clean outlines, 3-5 colors maximum,
> high contrast, suitable for pixel art conversion"

Sport-specific: football field/player, basketball silhouette, baseball diamond,
soccer ball/player, duck/hunting silhouettes. Bold thick lines survive quantization.
Black lines on dark background = use 5+ colors in settings to separate them.
Dog breeds: thick ears/tails, avoid thin details. Avoid thin snowflake arms / star points.

## Pattern generation engine (`src/modules/palette-reduction/quantize.ts`)
Two engines selected by imageType:

**GRAPHIC → kMeansExtract** (rewritten April 2026):
- Groups all pixels by ΔE 5 similarity (collapses JPEG noise, not real colors)
- Sorts groups by pixel count; if ≤ maxColors uses all directly
- If > maxColors: greedy closest-pair weighted merge until at budget
- Deterministic, no k-means iterations

**PHOTO → saliencyMedianCut**:
- Farthest-point anchor seeding: up to 4 anchors, each maximally distant from all prior anchors
- Center region = 30–70% of image (40% window), weighted 3× vs edges
- Slot fill: median cut oversampled ×6, then farthest-point pick for max ΔE per added color
- Post-quantization ΔE merge pass: removes pairs closer than ΔE 12, stops at maxColors/2 floor

**PIXEL → pixelArtExtract**: frequency-based, most common colors win, exact color preservation

`weightedDE(a, b)` shared helper: `sqrt(Δr²×2 + Δg²×4 + Δb²×3)` — perceptual RGB distance

## Layout / CSS
- `src/app/globals.css`: `.app-shell` uses `flex-direction: column` (critical — without it children stack horizontally as columns)
- `.app-shell > .project-page` — `max-width: 100% !important` for full-width pages (tracker)
- `src/components/layout/FaithFooter.tsx` — client component, returns null on `/track/[id]` routes
- `src/components/layout/RebrandBanner.tsx` — now shows "No AI involved" engine disclaimer; dismissed via localStorage key `cw_engine_banner_dismissed`; `maxWidth: 700` inner content; `className="site-banner"` for shadow suppression

## Pending / known issues
- Thumbnails are base64 JPEGs in JSON — can't use next/image WebP optimization yet
- `selectMostDistinct` in quantize.ts is now dead code (no longer called after slot allocation rewrite) — safe to remove eventually

## What NOT to do in new sessions
- Don't read all source files to answer theory/design questions
- Don't search for code when user is brainstorming
- For theory questions user should use claude.ai not Claude Code
- Only read files when making actual changes
