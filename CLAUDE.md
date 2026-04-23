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

## Shop system
- `public/shopTemplates.json` — full pattern data (5.3MB, loaded on detail page only)
- `public/shopIndex.json` — metadata only, no grids (100KB, loaded on listing page)
- `src/lib/shopStore.ts` — fetch functions, localStorage for staging
- Admin workflow: `/create?admin=1` → upload → preview → "Save to Shop (admin)" button
  → fill title/tags/category → Save → "Export Library JSON" downloads BOTH files
  → replace both in `/public/` → `git add public/*.json && git commit -m "..." && git push`
- Patterns saved with colour overrides baked in (activePalette used, not raw)

## Paywall / unlock
- `src/lib/unlock.ts` — isUnlocked() checks localStorage token
- Export page: `if (!isUnlocked() && !isAdmin)` guards PDF/PNG download
- `isAdmin` persists via sessionStorage (`cw_admin=1`), set by `?admin=1` on any page
- Stripe webhook at `/api/checkout/route.ts`

## Image generation (for shop patterns)
Universal prompt prefix for flat pixel-friendly images:
> "Flat vector illustration, bold geometric shapes, solid fill colors only,
> no gradients no shading no shadows, clean outlines, 3-5 colors maximum,
> high contrast, suitable for pixel art conversion"

Sport-specific: football field/player, basketball silhouette, baseball diamond,
soccer ball/player, duck/hunting silhouettes. Bold thick lines survive quantization.
Black lines on dark background = use 5+ colors in settings to separate them.

## Pending / known issues
- Dog breed prompts: thick ears/tails, avoid thin details
- Holiday prompts: avoid thin snowflake arms / star points
- Thumbnails are base64 JPEGs in JSON — can't use next/image WebP optimization yet
- RebrandBanner auto-hides after 2026-04-24T23:59:00Z

## What NOT to do in new sessions
- Don't read all source files to answer theory/design questions
- Don't search for code when user is brainstorming
- For theory questions user should use claude.ai not Claude Code
- Only read files when making actual changes
