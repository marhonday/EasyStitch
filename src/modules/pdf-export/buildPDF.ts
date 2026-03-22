/**
 * pdf-export/buildPDF.ts
 *
 * Public API for the PDF export module.
 *
 * Lazy-loads @react-pdf/renderer only when called — the library is ~180kb
 * and should not be in the initial JS bundle. It's only needed on the
 * export page, so dynamic import here keeps Time-to-Interactive fast.
 *
 * Two functions are exported:
 *
 * generatePdfBlob()   — returns a Blob for custom handling (tests, share sheet)
 * downloadPdf()       — generates and immediately triggers browser download
 *
 * Architecture note:
 * Neither function knows about React or the wizard context.
 * They take a PatternData value and a title string — nothing else.
 * The page component owns the UX around loading/error states.
 */

import React from 'react'
import { PatternData } from '@/types/pattern'

// ─── Lazy-loaded renderer ─────────────────────────────────────────────────────

async function getRenderer() {
  // Dynamic import keeps @react-pdf/renderer out of the initial bundle.
  // This module is only called from the export page.
  const { pdf } = await import('@react-pdf/renderer')
  return pdf
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a PDF Blob from pattern data.
 *
 * @param pattern  - The PatternData produced by generatePattern()
 * @param title    - Human-readable pattern title for the PDF header
 * @returns        - A Blob with MIME type application/pdf
 */
export async function generatePdfBlob(
  pattern: PatternData,
  title   = 'My Crochet Pattern'
): Promise<Blob> {
  const pdf = await getRenderer()

  // Import document component here (also benefits from lazy-load)
  const { default: PdfDocument } = await import('./PdfDocument')

  const element = React.createElement(PdfDocument, { pattern, title })
  const blob    = await pdf(element).toBlob()
  return blob
}

/**
 * Generate a PDF and immediately trigger a browser file download.
 *
 * @param pattern   - The PatternData produced by generatePattern()
 * @param filename  - Downloaded filename (without extension)
 * @param title     - Human-readable title for the PDF header
 */
export async function downloadPdf(
  pattern:  PatternData,
  filename = 'my-crochet-pattern',
  title    = 'My Crochet Pattern'
): Promise<void> {
  const blob = await generatePdfBlob(pattern, title)

  // Create a temporary <a> and click it — standard browser download trigger
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Release the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Generate a PDF data URI string.
 * Useful for <iframe src> preview or share sheets on mobile.
 *
 * TODO (richer export): use this to show an inline PDF preview before download
 */
export async function generatePdfDataUri(
  pattern: PatternData,
  title   = 'My Crochet Pattern'
): Promise<string> {
  const blob   = await generatePdfBlob(pattern, title)
  const buffer = await blob.arrayBuffer()
  const bytes  = new Uint8Array(buffer)
  const binary = bytes.reduce((str, b) => str + String.fromCharCode(b), '')
  return `data:application/pdf;base64,${btoa(binary)}`
}
