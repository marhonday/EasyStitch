/**
 * analyzeComplexity.ts
 *
 * Lightweight client-side image complexity scorer.
 * Runs entirely on a small canvas — no server round-trip.
 *
 * Scores three signals:
 *   edgeDensity    — ratio of pixels with high colour contrast to neighbours
 *   colorDiversity — normalized count of distinct 3-bit colour buckets
 *   entropy        — Shannon entropy of the 3-bit bucket distribution
 *
 * Combined into a 0–1 `score`, mapped to:
 *   'simple'   < 0.28  → graphic mode works fine
 *   'moderate' < 0.52  → photo mode suggested
 *   'complex'  ≥ 0.52  → photo mode strongly recommended
 */

export interface ComplexityResult {
  /** 0–1 proportion of edge-like pixels */
  edgeDensity:    number
  /** 0–1 normalised colour-bucket count */
  colorDiversity: number
  /** 0–1 combined weighted score */
  score:          number
  /** Human-readable tier */
  level:          'simple' | 'moderate' | 'complex'
  /**
   * Which engine to use:
   *  'graphic' — flat regions, low colour count works fine
   *  'photo'   — real-world detail, needs the full engine
   */
  recommendation: 'graphic' | 'photo'
  /** One-liner explanation for the UI */
  reason: string
  /** Suggested maxColors override for auto-optimize */
  suggestedColors: number
}

const CANVAS_SIZE      = 128   // downsample target (both axes)
const EDGE_THRESHOLD   = 35    // per-channel Euclidean diff to count as edge
const BUCKET_THRESHOLD = 0.005 // min pixel fraction for a bucket to count

export async function analyzeComplexity(
  dataUrl: string,
  vibrantRecommended: number,
): Promise<ComplexityResult> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = CANVAS_SIZE
        canvas.height = CANVAS_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(fallback(vibrantRecommended)); return }

        ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
        const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        let edgePixels    = 0
        let totalPixels   = 0
        const buckets     = new Map<number, number>()

        for (let y = 0; y < CANVAS_SIZE; y++) {
          for (let x = 0; x < CANVAS_SIZE; x++) {
            const i = (y * CANVAS_SIZE + x) * 4
            const alpha = data[i + 3]
            if (alpha < 20) continue
            totalPixels++

            const r = data[i], g = data[i + 1], b = data[i + 2]

            // 3-bit bucket per channel
            const bucket = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
            buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1)

            // Edge: compare right + bottom neighbours
            if (x < CANVAS_SIZE - 1) {
              const j = i + 4
              const dr = Math.abs(r - data[j])
              const dg = Math.abs(g - data[j + 1])
              const db = Math.abs(b - data[j + 2])
              if (Math.sqrt(dr * dr + dg * dg + db * db) > EDGE_THRESHOLD) edgePixels++
            }
            if (y < CANVAS_SIZE - 1) {
              const j = ((y + 1) * CANVAS_SIZE + x) * 4
              const dr = Math.abs(r - data[j])
              const dg = Math.abs(g - data[j + 1])
              const db = Math.abs(b - data[j + 2])
              if (Math.sqrt(dr * dr + dg * dg + db * db) > EDGE_THRESHOLD) edgePixels++
            }
          }
        }

        if (totalPixels === 0) { resolve(fallback(vibrantRecommended)); return }

        const edgeDensity = edgePixels / (totalPixels * 2) // *2 because we check 2 directions

        // Count significant buckets
        const minCount   = totalPixels * BUCKET_THRESHOLD
        let sigBuckets   = 0
        buckets.forEach(count => { if (count >= minCount) sigBuckets++ })
        // Normalize: 50+ buckets = diversity of 1.0
        const colorDiversity = Math.min(sigBuckets / 50, 1)

        // Shannon entropy (normalized)
        let entropy = 0
        buckets.forEach(count => {
          if (count < minCount) return
          const p = count / totalPixels
          entropy -= p * Math.log2(p)
        })
        const maxEntropy  = Math.log2(Math.min(sigBuckets, 50))
        const normEntropy = maxEntropy > 0 ? Math.min(entropy / maxEntropy, 1) : 0

        // Weighted combined score
        const score = 0.45 * edgeDensity + 0.35 * colorDiversity + 0.20 * normEntropy

        const level: ComplexityResult['level'] =
          score < 0.28 ? 'simple' :
          score < 0.52 ? 'moderate' :
          'complex'

        const recommendation: ComplexityResult['recommendation'] =
          level === 'simple' ? 'graphic' : 'photo'

        const reason =
          level === 'complex'
            ? `High edge detail and ${sigBuckets}+ colour regions detected — Photo mode will preserve fine features that Graphic mode would flatten`
            : level === 'moderate'
            ? `Moderate detail detected — Photo mode recommended for cleaner colour transitions`
            : `Simple shapes and flat colours detected — Graphic mode works great here`

        // Suggested color count: complex stays at vibrant recommendation, simpler images reduce it
        const suggestedColors =
          level === 'complex'  ? Math.max(vibrantRecommended, 16) :
          level === 'moderate' ? Math.min(vibrantRecommended, 16) :
                                  Math.min(vibrantRecommended, 8)

        resolve({ edgeDensity, colorDiversity, score, level, recommendation, reason, suggestedColors })
      } catch {
        resolve(fallback(vibrantRecommended))
      }
    }
    img.onerror = () => resolve(fallback(vibrantRecommended))
    img.src = dataUrl
  })
}

function fallback(vibrantRecommended: number): ComplexityResult {
  return {
    edgeDensity:    0,
    colorDiversity: 0,
    score:          0,
    level:          'simple',
    recommendation: 'graphic',
    reason:         '',
    suggestedColors: vibrantRecommended,
  }
}
