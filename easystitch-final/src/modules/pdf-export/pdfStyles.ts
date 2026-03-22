/**
 * pdf-export/pdfStyles.ts
 *
 * Shared design tokens and StyleSheet constants for all PDF components.
 * Kept separate so PdfDocument, PdfGrid, PdfColorKey, PdfInstructions
 * all reference the same values — no magic numbers scattered around.
 *
 * @react-pdf/renderer uses pt units (1pt = 1/72 inch).
 * A4 page: 595 × 842 pt.
 */

import { StyleSheet } from '@react-pdf/renderer'

// ─── Page geometry ────────────────────────────────────────────────────────────

export const PAGE = {
  width:         595,
  height:        842,
  marginX:       36,    // ~0.5 inch margin left/right
  marginY:       40,    // ~0.55 inch margin top/bottom
  get contentW() { return this.width  - this.marginX * 2 },
  get contentH() { return this.height - this.marginY * 2 },
}

// ─── Layout split ─────────────────────────────────────────────────────────────

// On the first page the grid takes ~65% of content width, key takes ~30%
// with a 5% gap between them.
export const LAYOUT = {
  gridColRatio:    0.65,
  keyColRatio:     0.30,
  colGap:          10,
  get gridColW()   { return PAGE.contentW * this.gridColRatio },
  get keyColW()    { return PAGE.contentW * this.keyColRatio  },
}

// ─── Grid cell sizing ─────────────────────────────────────────────────────────

/**
 * Choose a cell size (pt) that fits the full grid width in the available column.
 * Falls back to a minimum readable size rather than making cells invisible.
 */
export function computePdfCellSize(
  gridWidth:      number,
  availableWidth: number,
  minCellSize = 4,
  maxCellSize = 14
): number {
  const natural = Math.floor(availableWidth / gridWidth)
  return Math.max(minCellSize, Math.min(maxCellSize, natural))
}

/**
 * Returns how many pages are needed to render the full grid height
 * given a fixed cell size and available height per page.
 */
export function computeGridPages(
  gridHeight:      number,
  cellSize:        number,
  availableHeight: number
): number {
  const rowsPerPage = Math.floor(availableHeight / cellSize)
  return Math.ceil(gridHeight / rowsPerPage)
}

// ─── Brand colours ────────────────────────────────────────────────────────────

export const COLORS = {
  ink:           '#2C2218',
  inkLight:      '#6B5744',
  terracotta:    '#C4614A',
  cream:         '#FAF6EF',
  parchment:     '#F2EAD8',
  border:        '#E4D9C8',
  sageLight:     '#B5CEAC',
  white:         '#FFFFFF',
}

// ─── Typography ───────────────────────────────────────────────────────────────

// @react-pdf/renderer only supports system fonts or registered custom fonts.
// We use Helvetica (built-in) for body and Times-Roman for display headings —
// both are always available, no font loading needed.
// TODO (future richer exports): register Playfair Display via Font.register()
export const FONTS = {
  display: 'Times-Roman',
  body:    'Helvetica',
  mono:    'Courier',
}

// ─── Shared StyleSheet ────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  // ── Page ─────────────────────────────────────────────────────────────────
  page: {
    backgroundColor: COLORS.cream,
    paddingHorizontal: PAGE.marginX,
    paddingVertical:   PAGE.marginY,
    fontFamily:        FONTS.body,
    fontSize:          9,
    color:             COLORS.ink,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  headerBar: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.terracotta,
    paddingBottom:   8,
    marginBottom:    14,
  },
  headerLogo: {
    fontFamily:   FONTS.display,
    fontSize:     16,
    color:        COLORS.terracotta,
    fontWeight:   'bold',
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize:   13,
    color:      COLORS.ink,
  },
  headerMeta: {
    fontSize: 8,
    color:    COLORS.inkLight,
    marginTop: 2,
  },

  // ── Body layout ───────────────────────────────────────────────────────────
  bodyRow: {
    flexDirection: 'row',
    gap:           LAYOUT.colGap,
    flex:          1,
  },
  gridColumn: {
    width: LAYOUT.gridColW,
  },
  keyColumn: {
    width: LAYOUT.keyColW,
  },

  // ── Section labels ────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize:      7,
    fontWeight:    'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color:         COLORS.inkLight,
    marginBottom:  6,
  },

  // ── Colour key ────────────────────────────────────────────────────────────
  keyEntry: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  7,
  },
  keySwatch: {
    width:        16,
    height:       16,
    borderRadius: 3,
  },
  keySymbol: {
    width:       14,
    height:      14,
    borderRadius: 3,
    alignItems:  'center',
    justifyContent: 'center',
  },
  keySymbolText: {
    fontSize: 8,
    color:    COLORS.white,
    fontFamily: FONTS.mono,
  },
  keyLabel: {
    fontSize: 8,
    color:    COLORS.ink,
    flex:     1,
  },
  keyCount: {
    fontSize: 7,
    color:    COLORS.inkLight,
  },

  // ── Instructions ─────────────────────────────────────────────────────────
  instructionsBox: {
    backgroundColor: COLORS.parchment,
    borderRadius:    6,
    padding:         12,
    marginTop:       12,
  },
  instructionsTitle: {
    fontFamily:  FONTS.display,
    fontSize:    10,
    color:       COLORS.ink,
    marginBottom: 6,
  },
  instructionRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  5,
  },
  instructionBullet: {
    fontSize: 8,
    color:    COLORS.terracotta,
    width:    10,
  },
  instructionText: {
    fontSize:   8,
    color:      COLORS.inkLight,
    lineHeight: 1.5,
    flex:       1,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    borderTopWidth:  0.5,
    borderTopColor:  COLORS.border,
    paddingTop:      6,
    marginTop:       10,
  },
  footerText: {
    fontSize: 7,
    color:    COLORS.inkLight,
  },
})
