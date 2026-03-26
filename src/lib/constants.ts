import { GridSize, StitchStyle, ImageType, BorderLayer } from '@/types/pattern'

// ─── Monetization flag ────────────────────────────────────────────────────────
// Set to false to enable the paywall for PDF / full-pattern downloads.
// Set to true  to allow all downloads freely (current default).
export const FREE_MODE = true

// ─── Grid sizes ───────────────────────────────────────────────────────────────
// Based on standard crochet/C2C blanket sizes in stitches at typical gauge
// (worsted weight, ~4 sts/inch):
//   Baby blanket:    ~30×36 inches → 40×50 stitches
//   Lap blanket:     ~36×48 inches → 50×65 stitches
//   Throw blanket:   ~48×60 inches → 65×80 stitches
//   Twin blanket:    ~60×80 inches → 80×100 stitches
//   Full/Queen:      ~80×90 inches → 100×120 stitches

export const GRID_SIZES: GridSize[] = [
  { label: 'Baby',   width: 40,  height: 50  },
  { label: 'Lap',    width: 50,  height: 65  },
  { label: 'Throw',  width: 65,  height: 80  },
  { label: 'Twin',   width: 80,  height: 100 },
  { label: 'Queen',  width: 100, height: 120 },
]

// ─── Default settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  stitchStyle:     'c2c' as StitchStyle,
  gridSize:        GRID_SIZES[0],
  maxColors:       8,
  imageType:       'photo' as ImageType,
  backgroundColor: '#ffffff',
  borderLayers:    [] as BorderLayer[],
}

// ─── Stitch style display metadata ───────────────────────────────────────────

export interface StitchStyleMeta {
  label:       string
  description: string
  available:   boolean
}

export const STITCH_STYLE_META: Record<StitchStyle, StitchStyleMeta> = {
  c2c: {
    label:       'Corner to Corner',
    description: 'Diagonal stitch blocks',
    available:   true,
  },
  singleCrochet: {
    label:       'Single Crochet',
    description: 'Tight, detailed grid',
    available:   true,
  },
  tapestry: {
    label:       'Tapestry',
    description: 'Carry yarn across rows',
    available:   true,
  },
  mosaic: {
    label:       'Mosaic',
    description: 'Two-colour slip stitch',
    available:   true,
  },
  knittingStranded: {
    label:       'Stranded / Fair Isle',
    description: 'Carry both yarns across every row',
    available:   false,   // knitting route only
  },
  knittingIntarsia: {
    label:       'Intarsia / Standard',
    description: 'Separate yarn sections per colour area',
    available:   false,   // knitting route only
  },
  filetCrochet: {
    label:       'Filet Crochet',
    description: 'Open mesh — filled blocks and chain spaces',
    available:   false,   // filet route only
  },
  crossStitch: {
    label:       'Cross Stitch',
    description: 'Square grid for Aida cloth embroidery',
    available:   false,   // crossstitch route only
  },
}

// ─── Symbols ──────────────────────────────────────────────────────────────────

export const COLOR_SYMBOLS = ['■', '●', '▲', '◆', '★', '✿', '❤', '◉', '⬟', '⬡', '⊕', '⊗']

// ─── Color count limits ───────────────────────────────────────────────────────

export const MIN_COLORS = 2
export const MAX_COLORS = 32

// ─── Wizard steps (3-step flow) ───────────────────────────────────────────────

export const WIZARD_STEPS = [
  { label: 'Upload',   path: '/upload'   },
  { label: 'Settings', path: '/settings' },
  { label: 'Preview',  path: '/preview'  },
]

// ─── Yarn estimation (yards per stitch per style) ────────────────────────────
// Based on standard worsted weight yarn averages

export const YARDS_PER_STITCH: Record<StitchStyle, number> = {
  singleCrochet:    1.5,
  c2c:              1.8,
  tapestry:         2.1,
  mosaic:           1.6,
  knittingStranded: 1.4,
  knittingIntarsia: 1.2,
  filetCrochet:     1.8,
  crossStitch:      0.3,   // embroidery thread, much less per stitch
}
