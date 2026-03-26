/**
 * pdf-export/PdfGrid.tsx
 *
 * Renders the crochet pattern grid as SVG rectangles inside the PDF.
 *
 * FIX #1: @react-pdf/renderer v3 removed the <Canvas> painter API entirely.
 * The correct v3 approach uses SVG primitives: <Svg>, <Rect>, <G>.
 * We batch rects by colour using <G> grouping to minimise attribute repetition.
 *
 * Performance: For a 60×60 grid = 3600 <Rect> elements in the PDF SVG tree.
 * @react-pdf renders this synchronously during pdf() generation — acceptable
 * for our grid sizes. For grids >100×100 (future), consider pre-rasterising
 * to a PNG and embedding as <Image> instead.
 *
 * Row number labels are rendered every 5 rows using <Text> outside the SVG.
 */

import React from 'react'
import { View, Text, Svg, Rect } from '@react-pdf/renderer'
import { Cell, ColorEntry } from '@/types/pattern'
import { COLORS } from './pdfStyles'

interface PdfGridProps {
  rows:                Cell[][]
  palette:             ColorEntry[]
  cellSize:            number
  startRow:            number
  showRowNums:         boolean
  cellWidthMultiplier?: number
}

const ROW_LABEL_W = 14
const GAP         = 0.5   // pt gap between cells

export default function PdfGrid({
  rows,
  palette,
  cellSize,
  startRow,
  showRowNums,
  cellWidthMultiplier = 1,
}: PdfGridProps) {
  const colCount = rows[0]?.length ?? 0
  const rowCount = rows.length
  const labelW   = showRowNums ? ROW_LABEL_W : 0
  const cellW    = cellSize * cellWidthMultiplier
  const cellH    = cellSize
  const strideX  = cellW + GAP
  const strideY  = cellH + GAP
  const svgW     = colCount * strideX
  const svgH     = rowCount * strideY

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>

      {/* Row number labels — every 5th row */}
      {showRowNums && (
        <View style={{ width: labelW, marginRight: 2 }}>
          {rows.map((_, i) => (
            <View
              key={i}
              style={{ height: cellSize + GAP, justifyContent: 'center', alignItems: 'flex-end' }}
            >
              {(startRow + i + 1) % 5 === 0 && (
                <Text style={{ fontSize: Math.max(4, cellSize * 0.5), color: COLORS.inkLight }}>
                  {startRow + i + 1}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Grid as SVG — all cells in one SVG element */}
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Background fill for the gap colour */}
        <Rect x={0} y={0} width={svgW} height={svgH} fill={COLORS.border} />

        {/* Render cells grouped by colour to reduce attribute switches */}
        {palette.map((entry, colorIndex) => {
          // Collect all cell positions for this colour
          const positions: Array<{ x: number; y: number }> = []
          for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
              if (rows[r][c]?.colorIndex === colorIndex) {
                positions.push({ x: c * strideX, y: r * strideY })
              }
            }
          }
          if (positions.length === 0) return null

          return positions.map((pos, i) => (
            <Rect
              key={`${colorIndex}-${i}`}
              x={pos.x}
              y={pos.y}
              width={cellW}
              height={cellH}
              fill={entry.hex}
            />
          ))
        })}
      </Svg>
    </View>
  )
}
