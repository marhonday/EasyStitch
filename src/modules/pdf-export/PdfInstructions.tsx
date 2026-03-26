/**
 * pdf-export/PdfInstructions.tsx
 *
 * Beginner-friendly instructions block printed at the bottom of the
 * final PDF page. Written in plain language — no crochet jargon.
 *
 * Architecture note:
 * Instructions are driven by the stitch style so future strategies
 * (C2C, tapestry) can supply their own instruction sets without
 * editing this component — just extend the INSTRUCTIONS map below.
 */

import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { StitchStyle } from '@/types/pattern'
import { styles, COLORS } from './pdfStyles'

// ─── Instruction sets per stitch style ───────────────────────────────────────

interface InstructionSet {
  title: string
  steps: string[]
  tip:   string
}

const INSTRUCTIONS: Record<string, InstructionSet> = {
  graphghan: {
    title: 'How to use this pattern',
    steps: [
      'Start at the bottom-left corner of the grid. Work left-to-right across each row.',
      'Each coloured square = one double crochet (dc) stitch in that yarn colour.',
      'Change colours by starting the last "yarn over" of the previous stitch in the new colour.',
      'At the end of each row, chain 3 and turn. Your next row works right-to-left.',
      'Count your stitches at the end of each row — it should always match the grid width.',
    ],
    tip: 'Tip: Use a row counter or mark each completed row on a printed copy. Work in good lighting so the colour symbols are easy to read.',
  },
  c2c: {
    title: 'Corner-to-Corner (C2C) instructions',
    steps: [
      'Start at the bottom-right corner. Each "cell" is a small cluster of 3 double crochets.',
      'Work diagonally — each diagonal adds one cell more until the midpoint, then decreases.',
      'Follow the diagonal guides in the pattern. Each diagonal is numbered.',
      'Change colours at the start of each new cell by pulling through in the new yarn.',
    ],
    tip: 'Tip: Weave in ends as you go for C2C — there will be many colour changes.',
  },
  singleCrochet: {
    title: 'How to use this pattern',
    steps: [
      'Start at the bottom-left corner. Each square = one single crochet (sc) stitch.',
      'Work left-to-right for odd rows, right-to-left for even rows (or turn each row).',
      'Change colours by drawing through the new colour on the last pull of the previous stitch.',
      'Chain 1 to turn at the end of each row (not 3 — sc is shorter than dc).',
    ],
    tip: 'Tip: Single crochet produces a denser, heavier fabric than double crochet. Use a lighter yarn weight for similar finished dimensions.',
  },
  tapestry: {
    title: 'Tapestry crochet instructions',
    steps: [
      'Carry unused yarn strands across each row by crocheting over them.',
      'Only the active colour shows on the front — carried yarn is hidden inside stitches.',
      'Work right-side facing throughout (do not turn — join each row or use continuous spiral).',
      'Keep carried yarn tension even — too tight puckers the fabric, too loose creates loops.',
    ],
    tip: 'Tip: Tapestry crochet uses more yarn than standard graphghan. Buy 20–30% extra of each colour.',
  },
  crossStitch: {
    title: 'How to use this cross stitch chart',
    steps: [
      'Each coloured square with a symbol = one cross stitch in that thread colour.',
      'To make a cross stitch: bring needle up at bottom-left, down at top-right (half cross), then up at bottom-right, down at top-left to complete the X.',
      'Work all stitches in the same direction — half crosses first across a row, then complete on the return pass.',
      'The symbol in each square identifies the colour — use the colour key to match symbols to thread numbers.',
      'Count your Aida cloth carefully before starting — mark the centre of the fabric and work outward.',
    ],
    tip: 'Tip: Use 2 strands of embroidery floss on 14-count Aida, 1 strand on 28-count. Back-stitch over completed crosses to outline shapes for a crisp finish.',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PdfInstructionsProps {
  stitchStyle: StitchStyle
}

export default function PdfInstructions({ stitchStyle }: PdfInstructionsProps) {
  const set = INSTRUCTIONS[stitchStyle] ?? INSTRUCTIONS['c2c']

  return (
    <View style={styles.instructionsBox}>
      <Text style={styles.instructionsTitle}>{set.title}</Text>

      {set.steps.map((step, i) => (
        <View key={i} style={styles.instructionRow}>
          <Text style={styles.instructionBullet}>{i + 1}.</Text>
          <Text style={styles.instructionText}>{step}</Text>
        </View>
      ))}

      {/* Tip callout */}
      <View style={{
        marginTop:       8,
        paddingTop:      8,
        borderTopWidth:  0.5,
        borderTopColor:  COLORS.border,
      }}>
        <Text style={{
          fontSize:   7.5,
          color:      COLORS.inkLight,
          lineHeight: 1.5,
          fontStyle:  'italic',
        }}>
          {set.tip}
        </Text>
      </View>
    </View>
  )
}
