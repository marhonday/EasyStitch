// ─── Core domain types for EasyStitch pattern engine ────────────────────────
//
// Pipeline flow:
//   dataUrl → PixelGrid → QuantizedPalette + ColorMap → PatternData
//
// PatternData is the single output type consumed by rendering and PDF export.
// It is identical regardless of which stitch strategy produced it.

// ─── Stitch styles ────────────────────────────────────────────────────────────

/**
 * All supported stitch styles.
 *
 * graphghan      — filled square cells, any colour per cell (default, implemented)
 * c2c            — corner-to-corner diagonal blocks (placeholder)
 * singleCrochet  — tight SC grid; same visual as graphghan but different
 *                  stitch-count metadata and instructions (placeholder)
 * tapestry       — row-level colour-carry constraints enforced (placeholder)
 */
export type StitchStyle = 'c2c' | 'singleCrochet'

/**
 * How cells are ordered for pattern-reading instructions.
 * Stored in PatternMeta so PDF and preview renderers can draw guides correctly.
 *
 * rowByRow        — left-to-right, top-to-bottom (graphghan, singleCrochet)
 * diagonal        — corner-to-corner diagonal sweeps (c2c)
 * rowConstrained  — row-by-row with colour-carry validation notes (tapestry)
 */
export type TraversalOrder = 'rowByRow' | 'diagonal' | 'rowConstrained'

// ─── Grid / sizing ────────────────────────────────────────────────────────────

export interface GridSize {
  label:  string   // Beginner-friendly label e.g. "Small"
  width:  number
  height: number
}

// ─── Internal pipeline types (not exposed to UI) ─────────────────────────────

/**
 * Raw RGBA pixel data resampled to grid dimensions.
 * width * height * 4 bytes (R, G, B, A).
 */
export interface PixelGrid {
  data:   Uint8ClampedArray
  width:  number
  height: number
}

/**
 * A single colour in LAB colour space, used during quantization.
 * RGB stored alongside for fast nearest-neighbour lookup after bucketing.
 */
export interface LabColor {
  L:  number
  a:  number
  b:  number
  r:  number
  g:  number
  bl: number   // 'bl' avoids shadowing 'b' in closures
}

/**
 * A bucket of pixels used during median-cut quantization.
 * Each bucket is recursively split along its longest colour axis.
 */
export interface ColorBucket {
  pixels: LabColor[]
}

// ─── Palette & colour assignment ──────────────────────────────────────────────

/**
 * A single colour in the reduced palette.
 * Symbol assigned by perceived lightness: dark → light = first → last symbol.
 */
export interface ColorEntry {
  hex:         string
  r:           number
  g:           number
  b:           number
  symbol:      string    // e.g. "■", "●", "▲" — unique within a palette
  label?:      string    // Optional yarn colour name (future: match to yarn DB)
  stitchCount?: number   // Populated after grid assembly
}

/**
 * Flat index array mapping each grid cell to its palette colour.
 * Length = width * height. Value = index into ColorEntry[].
 */
export type ColorMap = Uint8Array

// ─── Pattern output ───────────────────────────────────────────────────────────

/**
 * A single stitch cell in the final pattern grid.
 */
export interface Cell {
  colorIndex: number   // Index into PatternData.palette
  symbol:     string   // Copied from palette for render convenience
}

/**
 * Metadata attached to every generated pattern.
 * Includes traversal order so renderers know how to draw row guides.
 */
export interface PatternMeta {
  width:          number
  height:         number
  colorCount:     number
  stitchStyle:    StitchStyle
  traversalOrder: TraversalOrder
  totalStitches:  number
  generatedAt:    string
  noiseCleaned?:  number   // cells reassigned by noise detection pass
}

/**
 * The complete output of the pattern engine.
 * Shape is identical regardless of which strategy produced it.
 * This is the only type that rendering, preview, and PDF modules consume.
 */
export interface PatternData {
  grid:    Cell[][]
  palette: ColorEntry[]
  meta:    PatternMeta
}

// ─── User-facing settings ─────────────────────────────────────────────────────

/**
 * How the engine should interpret the uploaded image.
 * photo   — any real-world photo: pets, people, flowers, landscapes
 * graphic — logos, clip art, flat illustrations, pre-gridded patterns
 */
export type ImageType = 'photo' | 'graphic'

/**
 * A single border layer around the pattern.
 * Layers are applied outside-in: layers[0] is outermost.
 */
export interface BorderLayer {
  color:  string   // hex
  width:  number   // stitches (1–6)
}

export interface PatternSettings {
  stitchStyle:     StitchStyle
  gridSize:        GridSize
  maxColors:       number
  imageType:       ImageType
  backgroundColor: string         // hex — always one palette slot, default '#ffffff'
  borderLayers:    BorderLayer[]  // 0–3 border layers, outermost first
}

export type PersonalizationPlacement = 'above' | 'below'
export type PersonalizationFontStyle = 'pressStart2P' | 'vt323' | 'silkscreen' | 'audiowide'

export interface PersonalizationSettings {
  enabled: boolean
  titleText: string
  dateText: string
  fontStyle: PersonalizationFontStyle
  placement: PersonalizationPlacement
  colorMode: 'palette' | 'custom'
  paletteColorIndex: number
  customColor: string
}

// ─── Wizard context state ─────────────────────────────────────────────────────

export interface PatternContextState {
  rawImage:       string | null
  enhancedImage:  string | null
  settings:       PatternSettings
  patternData:    PatternData | null
  isGenerating:   boolean
  detectedColors: number | null  // actual distinct colors found in uploaded image
  dominantPalette: { hex: string; population: number }[] | null
  recommendedColors: number | null
  personalization: PersonalizationSettings
}
