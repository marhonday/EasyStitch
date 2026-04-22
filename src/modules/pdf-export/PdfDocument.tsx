/**
 * pdf-export/PdfDocument.tsx
 *
 * Root @react-pdf/renderer Document — assembles pages, slices grid into row
 * bands, appends colour key + instructions on the final page.
 *
 * FIX #8: computeGridPages and rowsLastPage were imported/computed but never
 * used. The band-building loop now correctly applies rowsLastPage to the final
 * band so instructions don't overflow.
 *
 * Multi-page strategy:
 * We build bands in two passes:
 *   Pass 1 — build all bands using middlePage row count
 *   Pass 2 — if the last band has too many rows for lastPage budget, split it
 * This avoids the "we don't know which is last" chicken-and-egg problem.
 */

import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PatternData } from '@/types/pattern'
import { STITCH_STYLE_META } from '@/lib/constants'
import PdfGrid         from './PdfGrid'
import PdfColorKey     from './PdfColorKey'
import PdfInstructions from './PdfInstructions'
import {
  styles,
  COLORS,
  PAGE,
  LAYOUT,
  computePdfCellSize,
} from './pdfStyles'

interface PdfDocumentProps {
  pattern:              PatternData
  title?:               string
  includeInstructions?: boolean
  cellWidthMultiplier?: number
}

// Height (pt) reserved for non-grid content per page type
const HEADER_H   = 48    // header bar + padding (first page only)
const CONT_H     = 24    // continuation mini-header (subsequent pages)
const FOOTER_H   = 26    // footer bar + padding (all pages)
const INSTR_H    = 145   // instructions box (last page only)
const LABEL_H    = 16    // "Pattern Grid" section label (first page only)

export default function PdfDocument({ pattern, title = 'My Crochet Pattern', includeInstructions = true, cellWidthMultiplier = 1 }: PdfDocumentProps) {
  const { grid, palette, meta } = pattern
  const styleLabel = STITCH_STYLE_META[meta.stitchStyle]?.label ?? meta.stitchStyle
  const subtitle   = `${meta.width}×${meta.height} · ${meta.colorCount} colours · ${styleLabel}`

  const cellSize = computePdfCellSize(meta.width, LAYOUT.gridColW)

  // ── Available grid height per page type ───────────────────────────────────
  const firstH  = PAGE.contentH - HEADER_H - LABEL_H - FOOTER_H
  const middleH = PAGE.contentH - CONT_H   - FOOTER_H
  const lastH   = PAGE.contentH - CONT_H   - FOOTER_H - INSTR_H

  const rowsFirst  = Math.max(1, Math.floor(firstH  / cellSize))
  const rowsMiddle = Math.max(1, Math.floor(middleH / cellSize))
  const rowsLast   = Math.max(1, Math.floor(lastH   / cellSize))

  // ── Build page bands (two-pass) ───────────────────────────────────────────
  const bands: Array<{ rows: typeof grid; startRow: number }> = []
  let cursor = 0

  while (cursor < grid.length) {
    const isFirst = bands.length === 0
    const limit   = isFirst ? rowsFirst : rowsMiddle
    const take    = Math.min(limit, grid.length - cursor)
    bands.push({ rows: grid.slice(cursor, cursor + take), startRow: cursor })
    cursor += take
  }

  // Pass 2: trim last band to rowsLast if it would overflow with instructions
  if (bands.length > 0) {
    const last = bands[bands.length - 1]
    if (last.rows.length > rowsLast) {
      // Split: shrink last band and add overflow as an extra page
      const trimmed  = last.rows.slice(0, rowsLast)
      const overflow = last.rows.slice(rowsLast)
      bands[bands.length - 1] = { rows: trimmed, startRow: last.startRow }
      bands.push({ rows: overflow, startRow: last.startRow + rowsLast })
    }
  }

  const totalPages = bands.length

  return (
    <Document
      title={title}
      author="CraftWabi"
      subject="Crochet Graph Pattern"
      creator="craftwabi.com"
    >
      {bands.map((band, pageIdx) => {
        const isFirst = pageIdx === 0
        const isLast  = pageIdx === totalPages - 1

        return (
          <Page key={pageIdx} size="A4" style={styles.page}>

            {/* First page header */}
            {isFirst && (
              <View style={styles.headerBar}>
                <Text style={styles.headerLogo}>CraftWabi</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.headerTitle}>{title}</Text>
                  <Text style={styles.headerMeta}>{subtitle}</Text>
                </View>
              </View>
            )}

            {/* Continuation header */}
            {!isFirst && (
              <View style={{
                flexDirection:     'row',
                justifyContent:    'space-between',
                marginBottom:      8,
                paddingBottom:     5,
                borderBottomWidth: 0.5,
                borderBottomColor: COLORS.border,
              }}>
                <Text style={{ fontSize: 8, color: COLORS.inkLight }}>{title}</Text>
                <Text style={{ fontSize: 8, color: COLORS.inkLight }}>
                  Rows {band.startRow + 1}–{band.startRow + band.rows.length}
                </Text>
              </View>
            )}

            {/* Body: grid + key */}
            <View style={styles.bodyRow}>
              <View style={styles.gridColumn}>
                {isFirst && <Text style={styles.sectionLabel}>Pattern Grid</Text>}
                <PdfGrid
                  rows={band.rows}
                  palette={palette}
                  cellSize={cellSize}
                  startRow={band.startRow}
                  showRowNums={true}
                  cellWidthMultiplier={cellWidthMultiplier}
                />
              </View>

              {/* Colour key — first page only */}
              {isFirst && (
                <View style={styles.keyColumn}>
                  <PdfColorKey
                    palette={palette}
                    totalStitches={meta.totalStitches}
                  />
                </View>
              )}
            </View>

            {/* Instructions — last page only, if enabled */}
            {isLast && includeInstructions && <PdfInstructions stitchStyle={meta.stitchStyle} />}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>easystitch.app</Text>
              <Text style={styles.footerText}>Page {pageIdx + 1} of {totalPages}</Text>
              <Text style={styles.footerText}>
                {new Date(meta.generatedAt).toLocaleDateString()}
              </Text>
            </View>

          </Page>
        )
      })}
    </Document>
  )
}
