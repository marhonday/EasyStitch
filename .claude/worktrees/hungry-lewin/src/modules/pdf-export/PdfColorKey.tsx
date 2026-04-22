/**
 * pdf-export/PdfColorKey.tsx
 *
 * Colour key sidebar for the PDF — lists each palette colour with:
 * - Filled swatch rect
 * - Symbol character
 * - Colour label (or "Colour N" fallback)
 * - Stitch count and percentage
 *
 * Designed to fit in the narrow right column (LAYOUT.keyColW ≈ 150pt).
 * If more palette entries exist than fit, they wrap naturally.
 */

import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { ColorEntry } from '@/types/pattern'
import { styles, COLORS, FONTS } from './pdfStyles'

interface PdfColorKeyProps {
  palette:       ColorEntry[]
  totalStitches: number
}

export default function PdfColorKey({ palette, totalStitches }: PdfColorKeyProps) {
  return (
    <View>
      <Text style={styles.sectionLabel}>Colour Key</Text>

      {palette.map((entry, i) => {
        const count = entry.stitchCount ?? 0
        const pct   = totalStitches > 0
          ? Math.round((count / totalStitches) * 100)
          : 0

        return (
          <View key={i} style={styles.keyEntry}>
            {/* Colour swatch */}
            <View
              style={[
                styles.keySwatch,
                { backgroundColor: entry.hex },
              ]}
            />

            {/* Symbol box */}
            <View
              style={[
                styles.keySymbol,
                { backgroundColor: entry.hex },
              ]}
            >
              <Text style={styles.keySymbolText}>{entry.symbol}</Text>
            </View>

            {/* Label and count */}
            <View style={{ flex: 1 }}>
              <Text style={styles.keyLabel}>
                {entry.label ?? `Colour ${i + 1}`}
              </Text>
              <Text style={styles.keyCount}>
                {count.toLocaleString()} st ({pct}%)
              </Text>
            </View>
          </View>
        )
      })}

      {/* Divider */}
      <View style={{
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        marginTop:      8,
        paddingTop:     8,
      }}>
        <Text style={{ fontSize: 7, color: COLORS.inkLight, fontFamily: FONTS.body }}>
          Total: {totalStitches.toLocaleString()} stitches
        </Text>
      </View>
    </View>
  )
}
