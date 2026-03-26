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

const INSTRUCTIONS: Record<StitchStyle, InstructionSet> = {
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
  knittingStranded: {
    title: 'Stranded colorwork (Fair Isle) instructions',
    steps: [
      'Cast on your stitches. Work in stockinette (knit on RS, purl on WS) throughout.',
      'Carry both yarn colours across every row — the non-working yarn floats on the wrong side.',
      'Each square in the graph = one knit stitch. Read RS rows right-to-left, WS rows left-to-right.',
      'Keep float tension even — floats longer than 5 stitches should be caught to avoid snags.',
      'Block your finished piece: stranded fabric often pulls in. Blocking opens it to the correct dimensions.',
    ],
    tip: 'Tip: Stranded colorwork uses more yarn than plain knitting — add 20–30% extra per colour. Knit a tension swatch first to confirm your stitch-to-row ratio matches the graph.',
  },
  knittingIntarsia: {
    title: 'Intarsia colorwork instructions',
    steps: [
      'Wind a separate bobbin of yarn for each distinct colour section — do not carry yarn across.',
      'Each square in the graph = one knit stitch on the right side.',
      'At each colour change, twist the yarns around each other on the wrong side to avoid holes.',
      'Read RS rows right-to-left, WS rows left-to-right (standard knitting graph convention).',
      'Weave in all yarn tails on the WS as you go — intarsia produces many colour joins.',
    ],
    tip: 'Tip: Intarsia works best for large blocks of colour. For small isolated dots or thin lines, consider duplicate stitch over a plain base instead.',
  },
  mosaic: {
    title: 'Mosaic crochet instructions',
    steps: [
      'Work with 2 colours only per section — one active, one resting at the side edge.',
      'Each row: work in the active colour only. Slip stitch over any stitches you skip.',
      'To create the overlay effect: on the next same-colour row, work a DC into the skipped stitch 2 rows below.',
      'Switch colours every 2 rows — pick up the resting colour from the edge without cutting.',
      'Read the grid 2 rows at a time — each pair of rows forms one complete mosaic "layer".',
    ],
    tip: 'Tip: Mosaic crochet works best with high-contrast colour pairs. The pattern reads most clearly with 2–4 colours maximum.',
  },
  filetCrochet: {
    title: 'Filet crochet instructions',
    steps: [
      'Foundation: chain a multiple of 3 plus the number needed for your turning chain.',
      'Each FILLED square = 1 dc + 1 dc (block of 2 dc over existing block) or 2 dc into a chain space.',
      'Each OPEN square = 1 dc + ch 2 + skip 2 (creates the mesh hole).',
      'Work left-to-right on RS rows, right-to-left on WS rows. Chain 3 to turn.',
      'The filled and open squares on the graph directly match your stitch-by-stitch sequence.',
    ],
    tip: 'Tip: Filet crochet reads most clearly in a single solid colour — the contrast between filled blocks and open spaces creates the image. Use a smooth yarn (not fluffy) so the mesh holes stay open and visible.',
  },
  crossStitch: {
    title: 'How to use this cross stitch chart',
    steps: [
      'Each coloured square with a symbol = one cross stitch in that thread colour.',
      'To make a cross stitch: bring needle up at bottom-left, down at top-right (half cross), then up at bottom-right, down at top-left to complete the X.',
      'Work all half-crosses across a row first, then complete on the return — this keeps all stitches uniform.',
      'Use the colour key to match each symbol to a thread colour or DMC number.',
      'Count your Aida cloth carefully before starting — mark the centre and work outward.',
    ],
    tip: 'Tip: Use 2 strands of embroidery floss on 14-count Aida, 1–2 strands on 18-count, 1 strand on 28-count. Back-stitch outlines over completed stitches for a crisp, defined finish.',
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
