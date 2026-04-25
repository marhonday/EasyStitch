/**
 * palette-reduction/quantize.ts
 *
 * Two engines, auto-selected by imageType:
 *
 * GRAPHIC → kMeansExtract
 *   Finds real colors via k-means. Always seeds darkest + lightest first
 *   so black text and white backgrounds are guaranteed cluster centers.
 *   No anti-alias snapping (it was destroying black by snapping it to white).
 *   Instead: runs simplifyCrochet pre-pass in generatePattern before this
 *   runs, so by the time pixels arrive here they're already clean.
 *
 * PHOTO → saliencyMedianCut
 *   Weights pixels by local contrast so facial features/edges dominate
 *   palette building. Tile-based flat region detection pins uniform
 *   areas (walls, plain backdrops) to their own slots.
 */

import { PixelGrid, ColorEntry, ColorMap, LabColor, ColorBucket, ImageType } from '@/types/pattern'
import { rgbToLab, labDistance, rgbToHex, perceivedLightness } from './colorUtils'
import { COLOR_SYMBOLS } from '@/lib/constants'

export interface QuantizeResult {
  palette:  ColorEntry[]
  colorMap: ColorMap
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function buildColorMap(
  grid: PixelGrid,
  palette: ColorEntry[],
  transparentColorIndex?: number
): ColorMap {
  const colorMap   = new Uint8Array(grid.width * grid.height)
  const paletteLab = palette.map(e => rgbToLab(e.r, e.g, e.b))
  const alphaThreshold = 220
  let idx = 0
  for (let i = 0; i < grid.data.length; i += 4) {
    if (grid.data[i + 3] < alphaThreshold && typeof transparentColorIndex === 'number') {
      colorMap[idx] = transparentColorIndex
    } else {
      const lab = rgbToLab(grid.data[i], grid.data[i + 1], grid.data[i + 2])
      let bestIdx = 0, bestDist = Infinity
      for (let j = 0; j < paletteLab.length; j++) {
        const d = labDistance(lab, paletteLab[j])
        if (d < bestDist) { bestDist = d; bestIdx = j }
      }
      colorMap[idx] = bestIdx
    }
    idx++
  }
  return colorMap
}

function finalizePalette(colors: Array<{r:number,g:number,b:number}>): ColorEntry[] {
  const entries = colors.map(c => ({
    ...c,
    hex:      rgbToHex(c.r, c.g, c.b),
    lightness: perceivedLightness(c.r, c.g, c.b),
  }))
  entries.sort((a, b) => a.lightness - b.lightness)
  return entries.map((e, i) => ({ ...e, symbol: COLOR_SYMBOLS[i] ?? String(i + 1) }))
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function collectOpaqueLabSamples(grid: PixelGrid, maxSamples = 7000): LabColor[] {
  const out: LabColor[] = []
  const total = grid.width * grid.height
  const step = Math.max(1, Math.floor(total / maxSamples))
  for (let p = 0; p < total; p += step) {
    const i = p * 4
    if (grid.data[i + 3] < 220) continue
    out.push(rgbToLab(grid.data[i], grid.data[i + 1], grid.data[i + 2]))
  }
  return out
}

function appendDistinctColorsToTarget(
  grid: PixelGrid,
  palette: ColorEntry[],
  targetCount: number
): ColorEntry[] {
  if (palette.length >= targetCount) return palette
  const samples = collectOpaqueLabSamples(grid)
  if (!samples.length) return palette

  const out = [...palette]
  const minDistinct = 7

  while (out.length < targetCount) {
    const paletteLab = out.map((e) => rgbToLab(e.r, e.g, e.b))
    let best: LabColor | null = null
    let bestDist = -1

    for (const px of samples) {
      let minD = Infinity
      for (const pl of paletteLab) {
        const d = labDistance(px, pl)
        if (d < minD) minD = d
      }
      if (minD > bestDist) {
        bestDist = minD
        best = px
      }
    }

    if (!best || bestDist < minDistinct) break
    const nextIdx = out.length
    out.push({
      r: Math.round(best.r),
      g: Math.round(best.g),
      b: Math.round(best.bl),
      hex: rgbToHex(Math.round(best.r), Math.round(best.g), Math.round(best.bl)),
      symbol: COLOR_SYMBOLS[nextIdx] ?? String(nextIdx + 1),
    })
  }

  return out
}

function ensureBackgroundColorInPalette(
  palette: ColorEntry[],
  backgroundColor: string
): { palette: ColorEntry[]; bgIndex: number } {
  const { r, g, b } = parseHexColor(backgroundColor)
  const wantedHex = rgbToHex(r, g, b).toLowerCase()
  const existing = palette.findIndex((p) => p.hex.toLowerCase() === wantedHex)
  if (existing >= 0) return { palette, bgIndex: existing }

  const nextIndex = palette.length
  return {
    bgIndex: nextIndex,
    palette: [
      ...palette,
      { r, g, b, hex: wantedHex, symbol: COLOR_SYMBOLS[nextIndex] ?? String(nextIndex + 1) },
    ],
  }
}

function hasTransparentPixels(grid: PixelGrid): boolean {
  for (let i = 3; i < grid.data.length; i += 4) {
    if (grid.data[i] < 245) return true
  }
  return false
}

function applyBackgroundPreference(
  grid: PixelGrid,
  palette: ColorEntry[],
  colorMap: ColorMap,
  backgroundColor: string
): { palette: ColorEntry[]; colorMap: ColorMap } {
  if (!palette.length || !colorMap.length) return { palette, colorMap }

  const { width, height } = grid
  const edgeVotes = new Int32Array(palette.length)
  let edgeTotal = 0

  // Vote with all border cells to estimate dominant background color.
  for (let col = 0; col < width; col++) {
    edgeVotes[colorMap[col]]++
    edgeVotes[colorMap[(height - 1) * width + col]]++
    edgeTotal += 2
  }
  for (let row = 1; row < height - 1; row++) {
    edgeVotes[colorMap[row * width]]++
    edgeVotes[colorMap[row * width + (width - 1)]]++
    edgeTotal += 2
  }

  let dominantEdgeIdx = 0
  for (let i = 1; i < edgeVotes.length; i++) {
    if (edgeVotes[i] > edgeVotes[dominantEdgeIdx]) dominantEdgeIdx = i
  }
  const dominantEdgeFraction = edgeTotal > 0 ? edgeVotes[dominantEdgeIdx] / edgeTotal : 0

  // If the border doesn't have a dominant color, don't touch mapping.
  if (dominantEdgeFraction < 0.18) return { palette, colorMap }

  const { palette: nextPalette, bgIndex } = ensureBackgroundColorInPalette(palette, backgroundColor)
  const nextColorMap = new Uint8Array(colorMap)

  // Treat frequently-occurring edge colors as background candidates.
  const EDGE_CANDIDATE_MIN = 0.08
  const bgCandidates = new Set<number>()
  for (let i = 0; i < edgeVotes.length; i++) {
    const frac = edgeTotal > 0 ? edgeVotes[i] / edgeTotal : 0
    if (i === dominantEdgeIdx || frac >= EDGE_CANDIDATE_MIN) bgCandidates.add(i)
  }

  // Flood-fill from border through only background-candidate colors.
  // This recolors connected background regions without collapsing subject detail.
  const visited = new Uint8Array(width * height)
  const queue: number[] = []
  const push = (idx: number) => {
    if (visited[idx]) return
    if (!bgCandidates.has(nextColorMap[idx])) return
    visited[idx] = 1
    queue.push(idx)
  }

  for (let col = 0; col < width; col++) {
    push(col)
    push((height - 1) * width + col)
  }
  for (let row = 1; row < height - 1; row++) {
    push(row * width)
    push(row * width + (width - 1))
  }

  while (queue.length) {
    const idx = queue.shift()!
    nextColorMap[idx] = bgIndex
    const row = Math.floor(idx / width)
    const col = idx % width
    if (row > 0) push(idx - width)
    if (row < height - 1) push(idx + width)
    if (col > 0) push(idx - 1)
    if (col < width - 1) push(idx + 1)
  }

  return { palette: nextPalette, colorMap: nextColorMap }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE 1: K-MEANS — graphics, logos, flat art
// ═══════════════════════════════════════════════════════════════════════════════

const KMEANS_MAX_ITER   = 25
const KMEANS_SAMPLE_MAX = 3000

/**
 * Count genuinely distinct colors using a loose LAB threshold.
 * We use 18 (not 10) — tight enough to separate real colors,
 * loose enough to group JPEG gradient variations as one color.
 */
function countDistinctColors(pixels: LabColor[], maxColors: number): number {
  const THRESHOLD = 18
  const reps: LabColor[] = []
  for (const px of pixels) {
    let found = false
    for (const r of reps) {
      if (labDistance(px, r) < THRESHOLD) { found = true; break }
    }
    if (!found) {
      reps.push(px)
      if (reps.length >= maxColors) break
    }
  }
  return reps.length
}

function kMeansCluster(pixels: LabColor[], k: number): LabColor[] {
  if (pixels.length === 0) return []
  if (pixels.length <= k)  return pixels

  const step    = Math.max(1, Math.floor(pixels.length / KMEANS_SAMPLE_MAX))
  const samples = pixels.filter((_, i) => i % step === 0)

  // Guaranteed seeds in order: darkest, lightest, most saturated, 2nd most saturated
  // This covers: black text, white bg, pink swoosh, green letters — for a 4-color logo
  let darkest = samples[0], lightest = samples[0]
  let mostSat = samples[0], secondSat = samples[0]
  for (const p of samples) {
    if (p.L < darkest.L) darkest = p
    if (p.L > lightest.L) lightest = p
    const sat = Math.sqrt(p.a * p.a + p.b * p.b)
    const s1  = Math.sqrt(mostSat.a * mostSat.a + mostSat.b * mostSat.b)
    const s2  = Math.sqrt(secondSat.a * secondSat.a + secondSat.b * secondSat.b)
    if (sat > s1) { secondSat = mostSat; mostSat = p }
    else if (sat > s2 && labDistance(p, mostSat) > 15) secondSat = p
  }

  const centers: LabColor[] = [darkest]
  if (k > 1 && labDistance(lightest, darkest) > 8) centers.push(lightest)
  if (k > 2 && labDistance(mostSat, darkest) > 8 && labDistance(mostSat, lightest) > 8) {
    centers.push(mostSat)
  }
  if (k > 3 && labDistance(secondSat, darkest) > 8 && labDistance(secondSat, lightest) > 8
      && labDistance(secondSat, mostSat) > 8) {
    centers.push(secondSat)
  }

  // Fill remaining with k-means++ weighted distance
  while (centers.length < k) {
    let totalDist = 0
    const dists = samples.map(p => {
      const minD = Math.min(...centers.map(c => labDistance(p, c)))
      totalDist += minD * minD
      return minD * minD
    })
    let rand = Math.random() * totalDist, placed = false
    for (let i = 0; i < samples.length; i++) {
      rand -= dists[i]
      if (rand <= 0) { centers.push(samples[i]); placed = true; break }
    }
    if (!placed) centers.push(samples[samples.length - 1])
  }

  // Iterate
  const assignments = new Int32Array(samples.length)
  for (let iter = 0; iter < KMEANS_MAX_ITER; iter++) {
    let changed = false
    for (let i = 0; i < samples.length; i++) {
      let bestIdx = 0, bestDist = Infinity
      for (let j = 0; j < centers.length; j++) {
        const d = labDistance(samples[i], centers[j])
        if (d < bestDist) { bestDist = d; bestIdx = j }
      }
      if (assignments[i] !== bestIdx) { assignments[i] = bestIdx; changed = true }
    }
    if (!changed) break

    const sums = Array.from({ length: k }, () => ({ L:0, a:0, b:0, r:0, g:0, bl:0, n:0 }))
    for (let i = 0; i < samples.length; i++) {
      const s = sums[assignments[i]]
      s.L += samples[i].L; s.a += samples[i].a; s.b += samples[i].b
      s.r += samples[i].r; s.g += samples[i].g; s.bl += samples[i].bl
      s.n++
    }
    for (let j = 0; j < k; j++) {
      const s = sums[j]
      if (s.n > 0) centers[j] = {
        L: s.L/s.n, a: s.a/s.n, b: s.b/s.n,
        r: s.r/s.n, g: s.g/s.n, bl: s.bl/s.n
      }
    }
  }
  return mergeNearDuplicateCenters(centers, k)
}

/**
 * After k-means converges, merge any centers that are perceptually very close.
 * This collapses anti-alias grey clusters into their nearest real color
 * (e.g. grey from logo text edges → black, light grey → white).
 * We merge smallest cluster into nearest larger one when ΔE < MERGE_THRESHOLD.
 */
const MERGE_THRESHOLD = 8  // only merge near-identical colors, not perceptually different ones

function mergeNearDuplicateCenters(centers: LabColor[], k: number): LabColor[] {
  if (centers.length <= 1) return centers

  let merged = [...centers]
  let changed = true
  while (changed && merged.length > 1) {
    changed = false
    outer: for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const li = rgbToLab(Math.round(merged[i].r), Math.round(merged[i].g), Math.round(merged[i].bl))
        const lj = rgbToLab(Math.round(merged[j].r), Math.round(merged[j].g), Math.round(merged[j].bl))
        if (labDistance(li, lj) < MERGE_THRESHOLD) {
          // Keep the more "extreme" one (darker or lighter = more intentional)
          const iExtreme = Math.abs(li.L - 50)
          const jExtreme = Math.abs(lj.L - 50)
          const keep = iExtreme >= jExtreme ? i : j
          const drop = iExtreme >= jExtreme ? j : i
          merged.splice(drop, 1)
          changed = true
          break outer
        }
      }
    }
  }
  return merged
}

function kMeansExtract(grid: PixelGrid, maxColors: number): ColorEntry[] {
  const { data } = grid

  // Collect all opaque pixels
  const allPixels: LabColor[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) allPixels.push(rgbToLab(data[i], data[i + 1], data[i + 2]))
  }
  if (allPixels.length === 0) return []

  // Find extreme anchors — single real pixels, no averaging drift
  let darkest = allPixels[0], lightest = allPixels[0]
  let mostSat = allPixels[0], secondSat = allPixels[0]
  for (const p of allPixels) {
    if (p.L < darkest.L) darkest = p
    if (p.L > lightest.L) lightest = p
    const sat = Math.sqrt(p.a * p.a + p.b * p.b)
    const s1  = Math.sqrt(mostSat.a * mostSat.a + mostSat.b * mostSat.b)
    const s2  = Math.sqrt(secondSat.a * secondSat.a + secondSat.b * secondSat.b)
    if (sat > s1) { secondSat = mostSat; mostSat = p }
    else if (sat > s2 && labDistance(p, mostSat) > 20) secondSat = p
  }

  // Build palette starting from anchors — use the ACTUAL pixel value, not an average
  // This prevents black drifting to gold, pink drifting to crimson, etc.
  const DISTINCT = 30  // minimum ΔE to be considered a separate color
  const seeds: LabColor[] = []
  for (const candidate of [darkest, lightest, mostSat, secondSat]) {
    if (seeds.every(s => labDistance(candidate, s) > DISTINCT)) {
      seeds.push(candidate)
    }
    if (seeds.length >= maxColors) break
  }

  // If we still need more colors, find them by scanning for unclaimed pixel clusters
  if (seeds.length < maxColors) {
    // Mark which pixels are already "claimed" by a seed
    const unclaimed = allPixels.filter(p => seeds.every(s => labDistance(p, s) > DISTINCT))

    // Find next most common cluster in unclaimed pixels
    while (seeds.length < maxColors && unclaimed.length > 0) {
      // Sample unclaimed pixels and find the most "popular" color region
      const step = Math.max(1, Math.floor(unclaimed.length / 300))
      const sample = unclaimed.filter((_, i) => i % step === 0)

      let bestCenter: LabColor | null = null
      let bestCount = 0
      for (const candidate of sample) {
        const count = sample.filter(p => labDistance(p, candidate) < DISTINCT).length
        if (count > bestCount && seeds.every(s => labDistance(candidate, s) > DISTINCT)) {
          bestCount = count
          bestCenter = candidate
        }
      }

      if (!bestCenter) break
      seeds.push(bestCenter)

      // Remove claimed pixels
      const toRemove = new Set(unclaimed.map((p, i) => i).filter(i => labDistance(unclaimed[i], bestCenter!) < DISTINCT))
      unclaimed.splice(0, unclaimed.length, ...unclaimed.filter((_, i) => !toRemove.has(i)))
    }
  }

  // Convert seed LAB values directly to RGB — no averaging, exact pixel colors
  return finalizePalette(seeds.map(s => ({
    r: Math.round(s.r),
    g: Math.round(s.g),
    b: Math.round(s.bl),
  })))
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE 2: SALIENCY MEDIAN-CUT — photos
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_SALIENCY_WEIGHT = 6
const CENTER_BONUS        = 1.5

function extractSaliencyPixels(grid: PixelGrid): LabColor[] {
  const { data, width, height } = grid
  const labGrid: LabColor[] = new Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const d = i * 4
    labGrid[i] = rgbToLab(data[d], data[d + 1], data[d + 2])
  }

  const marginX = Math.floor(width  * 0.20)
  const marginY = Math.floor(height * 0.20)
  const pixels: LabColor[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (data[i * 4 + 3] < 128) continue
      const lab = labGrid[i]

      let cSum = 0, cCount = 0
      if (x > 0)          { cSum += labDistance(lab, labGrid[i-1]);     cCount++ }
      if (x < width - 1)  { cSum += labDistance(lab, labGrid[i+1]);     cCount++ }
      if (y > 0)          { cSum += labDistance(lab, labGrid[i-width]); cCount++ }
      if (y < height - 1) { cSum += labDistance(lab, labGrid[i+width]); cCount++ }

      const avgContrast = cCount > 0 ? cSum / cCount : 0
      const saliency    = Math.min(MAX_SALIENCY_WEIGHT, 1 + Math.floor(avgContrast / 4))
      const isCenter    = x >= marginX && x < width - marginX && y >= marginY && y < height - marginY
      const weight      = isCenter ? Math.ceil(saliency * CENTER_BONUS) : saliency

      for (let w = 0; w < weight; w++) pixels.push(lab)
    }
  }
  return pixels
}

function detectFlatRegions(grid: PixelGrid, maxSlots: number): Array<{r:number,g:number,b:number}> {
  const { data, width, height } = grid
  const TILE   = Math.max(4, Math.floor(Math.min(width, height) / 8))
  const VARLIM = 80
  const CDELTA = 20
  const flatTiles: LabColor[] = []

  for (let ty = 0; ty < height; ty += TILE) {
    for (let tx = 0; tx < width; tx += TILE) {
      const tpx: LabColor[] = []
      for (let dy = 0; dy < TILE && ty+dy < height; dy++)
        for (let dx = 0; dx < TILE && tx+dx < width; dx++) {
          const i = ((ty+dy)*width+(tx+dx))*4
          if (data[i+3] >= 128) tpx.push(rgbToLab(data[i], data[i+1], data[i+2]))
        }
      if (tpx.length < 4) continue
      const n = tpx.length
      const mean: LabColor = {
        L: tpx.reduce((s,p)=>s+p.L,0)/n, a: tpx.reduce((s,p)=>s+p.a,0)/n,
        b: tpx.reduce((s,p)=>s+p.b,0)/n, r: tpx.reduce((s,p)=>s+p.r,0)/n,
        g: tpx.reduce((s,p)=>s+p.g,0)/n, bl: tpx.reduce((s,p)=>s+p.bl,0)/n,
      }
      const variance = tpx.reduce((s,p) => s + labDistance(p,mean)**2, 0) / n
      if (variance < VARLIM) flatTiles.push(mean)
    }
  }
  if (flatTiles.length === 0) return []

  const clusters: LabColor[][] = []
  for (const tile of flatTiles) {
    let placed = false
    for (const c of clusters) {
      if (labDistance(tile, c[0]) < CDELTA) { c.push(tile); placed = true; break }
    }
    if (!placed) clusters.push([tile])
  }
  clusters.sort((a,b) => b.length - a.length)

  const totalTiles = Math.ceil(width/TILE) * Math.ceil(height/TILE)
  return clusters
    .slice(0, maxSlots)
    .filter(c => c.length / totalTiles >= 0.05)
    .map(c => {
      const n = c.length
      return {
        r: Math.round(c.reduce((s,p)=>s+p.r,0)/n),
        g: Math.round(c.reduce((s,p)=>s+p.g,0)/n),
        b: Math.round(c.reduce((s,p)=>s+p.bl,0)/n),
      }
    })
}

function longestAxis(pixels: LabColor[]): 'L'|'a'|'b' {
  let minL=Infinity,maxL=-Infinity,minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity
  for (const p of pixels) {
    if(p.L<minL)minL=p.L; if(p.L>maxL)maxL=p.L
    if(p.a<minA)minA=p.a; if(p.a>maxA)maxA=p.a
    if(p.b<minB)minB=p.b; if(p.b>maxB)maxB=p.b
  }
  const rL=maxL-minL, rA=maxA-minA, rB=maxB-minB
  return rL>=rA&&rL>=rB?'L':rA>=rB?'a':'b'
}

function splitBucket(bkt: ColorBucket): [ColorBucket, ColorBucket] {
  const axis   = longestAxis(bkt.pixels)
  const sorted = [...bkt.pixels].sort((a,b) => {
    const av = axis==='L'?a.L:axis==='a'?a.a:a.b
    const bv = axis==='L'?b.L:axis==='a'?b.a:b.b
    return av-bv
  })
  const mid = Math.floor(sorted.length/2)
  return [{pixels:sorted.slice(0,mid)},{pixels:sorted.slice(mid)}]
}

function medianCut(pixels: LabColor[], maxColors: number): ColorBucket[] {
  if (pixels.length===0) return []
  let buckets: ColorBucket[] = [{pixels}]
  while (buckets.length < maxColors) {
    let bestIdx=0, bestRange=-1
    for (let i=0;i<buckets.length;i++) {
      if (buckets[i].pixels.length<=1) continue
      const axis = longestAxis(buckets[i].pixels)
      const vals = buckets[i].pixels.map(p=>axis==='L'?p.L:axis==='a'?p.a:p.b)
      const range = Math.max(...vals)-Math.min(...vals)
      if (range>bestRange){bestRange=range;bestIdx=i}
    }
    if (bestRange<=0) break
    const [left,right] = splitBucket(buckets[bestIdx])
    buckets.splice(bestIdx,1,left,right)
    if (buckets.every(bkt=>bkt.pixels.length<=1)) break
  }
  return buckets
}

function selectMostDistinct(candidates: ColorEntry[], k: number): ColorEntry[] {
  if (candidates.length<=k) return candidates
  const labVals  = candidates.map(e=>rgbToLab(e.r,e.g,e.b))
  const selected: number[] = []
  const remaining = new Set(candidates.map((_,i)=>i))

  // Seed: darkest first
  let seedIdx=0, minL=Infinity
  for (const i of remaining) { if(labVals[i].L<minL){minL=labVals[i].L;seedIdx=i} }
  selected.push(seedIdx); remaining.delete(seedIdx)

  while (selected.length<k && remaining.size>0) {
    let bestIdx=-1, bestDist=-1
    for (const i of remaining) {
      let minDist=Infinity
      for (const s of selected){const d=labDistance(labVals[i],labVals[s]);if(d<minDist)minDist=d}
      if(minDist>bestDist){bestDist=minDist;bestIdx=i}
    }
    if(bestIdx===-1)break
    selected.push(bestIdx); remaining.delete(bestIdx)
  }
  const result=selected.map(i=>candidates[i])
  result.sort((a,b)=>perceivedLightness(a.r,a.g,a.b)-perceivedLightness(b.r,b.g,b.b))
  return result.map((e,i)=>({...e,symbol:COLOR_SYMBOLS[i]??String(i+1)}))
}

function saliencyMedianCut(
  grid:            PixelGrid,
  maxColors:       number,
  backgroundColor: string = '#ffffff'
): ColorEntry[] {
  const { data } = grid

  // ── Step 1: Collect all opaque pixels ─────────────────────────────────────
  const allPixels: LabColor[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) allPixels.push(rgbToLab(data[i], data[i + 1], data[i + 2]))
  }
  if (allPixels.length === 0) return []

  // ── Farthest-point anchor seeding ─────────────────────────────────────────
  // Guarantees anchors are maximally spread across the image's actual color space
  // Step 1: Always start with darkest pixel (captures eyes, pupils, outlines)
  let darkest = allPixels[0]
  for (const p of allPixels) {
    if (p.L < darkest.L) darkest = p
  }

  // Step 2: Farthest-point sampling — each new anchor is the pixel
  // most perceptually distant from ALL current anchors combined
  const anchors: LabColor[] = [darkest]
  const ANCHOR_COUNT = Math.min(4, Math.floor(maxColors / 2))

  for (let a = 1; a < ANCHOR_COUNT; a++) {
    let bestPixel   = allPixels[0]
    let bestMinDist = -1

    for (const p of allPixels) {
      // Find this pixel's minimum distance to any existing anchor
      let minDist = Infinity
      for (const anchor of anchors) {
        const d = labDistance(p, anchor)
        if (d < minDist) minDist = d
      }
      // Pick the pixel whose minimum distance to anchors is largest
      if (minDist > bestMinDist) {
        bestMinDist = minDist
        bestPixel   = p
      }
    }

    // Only add if meaningfully distinct from existing anchors
    if (bestMinDist > 15) anchors.push(bestPixel)
  }

  const anchorSlots = anchors.length
  const remainSlots = Math.max(1, maxColors - anchorSlots)

  // ── Step 3: Saliency-weighted pixels for remaining slots ──────────────────
  // Exclude pixels already covered by anchors so remaining slots find new colors
  const CLAIM_DIST   = 20
  const saliencyPxls = extractSaliencyPixels(grid)
  const unclaimed    = saliencyPxls.filter(p =>
    anchors.slice(0, anchorSlots).every(a => labDistance(p, a) > CLAIM_DIST)
  )

  const usePixels      = unclaimed.length > remainSlots * 3 ? unclaimed : saliencyPxls
  const oversampleGoal = Math.min(remainSlots * 4, 80)
  const buckets        = medianCut(usePixels, oversampleGoal)

  const candidates = buckets
    .filter(bkt => bkt.pixels.length > 0)
    .map(bkt => {
      let rS=0,gS=0,bS=0
      for (const p of bkt.pixels){rS+=p.r;gS+=p.g;bS+=p.b}
      const n=bkt.pixels.length
      const r=Math.round(rS/n),g=Math.round(gS/n),b=Math.round(bS/n)
      return {r,g,b,hex:rgbToHex(r,g,b),lightness:perceivedLightness(r,g,b)}
    })
  candidates.sort((a,b)=>a.lightness-b.lightness)
  const candidateEntries: ColorEntry[] = candidates.map((e,i)=>({...e,symbol:COLOR_SYMBOLS[i]??String(i+1)}))
  const subjectSelected = selectMostDistinct(candidateEntries, remainSlots)

  // ── Step 4: Combine anchors + saliency colors ──────────────────────────────
  const anchorEntries: ColorEntry[] = anchors.slice(0, anchorSlots).map((a, i) => ({
    r:   Math.round(a.r),
    g:   Math.round(a.g),
    b:   Math.round(a.bl),
    hex: rgbToHex(Math.round(a.r), Math.round(a.g), Math.round(a.bl)),
    symbol: COLOR_SYMBOLS[i] ?? String(i + 1),
    lightness: a.L,
  }))

  const combined = [...anchorEntries, ...subjectSelected]
  combined.sort((a,b) => perceivedLightness(a.r,a.g,a.b) - perceivedLightness(b.r,b.g,b.b))
  return combined.map((e,i) => ({...e, symbol: COLOR_SYMBOLS[i]??String(i+1)}))
}


// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE 3: PIXEL ART — existing grid patterns, cross stitch charts, sprites
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Frequency-based palette extraction for pixel art / existing grid patterns.
 * Instead of k-means or saliency weighting, we simply count how often each
 * distinct color appears. The most common colors get palette slots first —
 * this preserves the exact original colors (cream, light blue, navy, etc.)
 * without any hue drift from clustering or edge-weighting.
 */
function pixelArtExtract(grid: PixelGrid, maxColors: number): ColorEntry[] {
  const { data } = grid
  const CLUSTER_THRESH = 14  // LAB ΔE — tight enough to keep distinct colors separate

  // Subsample for performance on large grids
  const total = data.length / 4
  const step  = Math.max(1, Math.floor(total / 8000))

  type Cluster = {
    lab: LabColor
    rSum: number; gSum: number; bSum: number
    count: number
  }
  const clusters: Cluster[] = []

  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const lab = rgbToLab(r, g, b)

    let nearest = -1, nearestDist = CLUSTER_THRESH
    for (let j = 0; j < clusters.length; j++) {
      const d = labDistance(lab, clusters[j].lab)
      if (d < nearestDist) { nearestDist = d; nearest = j }
    }

    if (nearest >= 0) {
      const c = clusters[nearest]
      c.count++
      c.rSum += r; c.gSum += g; c.bSum += b
      // Incremental LAB mean for distance comparisons
      c.lab.L += (lab.L - c.lab.L) / c.count
      c.lab.a += (lab.a - c.lab.a) / c.count
      c.lab.b += (lab.b - c.lab.b) / c.count
    } else {
      clusters.push({ lab: { ...lab }, rSum: r, gSum: g, bSum: b, count: 1 })
    }
  }

  // Sort by frequency — most common colors first
  clusters.sort((a, b) => b.count - a.count)

  // Take top maxColors ensuring they remain perceptually distinct
  const selected: Cluster[] = []
  for (const c of clusters) {
    if (selected.length >= maxColors) break
    if (selected.every(s => labDistance(c.lab, s.lab) >= 10)) {
      selected.push(c)
    }
  }

  return finalizePalette(selected.map(c => ({
    r: Math.round(c.rSum / c.count),
    g: Math.round(c.gSum / c.count),
    b: Math.round(c.bSum / c.count),
  })))
}

// ─── Auto-detect image type ───────────────────────────────────────────────────

/**
 * Automatically detect if an image is a graphic/logo or a photo.
 * Graphics have: few distinct colors, high color uniformity within regions,
 * sharp hard edges. Photos have: many colors, smooth gradients, noise.
 *
 * We measure: ratio of flat tiles vs total tiles. If >50% of tiles are
 * flat (low variance), it's a graphic. Photos are rarely that flat.
 */
export function detectImageType(grid: PixelGrid): ImageType {
  const { data, width, height } = grid
  const TILE   = Math.max(4, Math.floor(Math.min(width, height) / 8))
  const VARLIM = 60
  let flatCount = 0, totalCount = 0

  for (let ty = 0; ty < height; ty += TILE) {
    for (let tx = 0; tx < width; tx += TILE) {
      const tpx: LabColor[] = []
      for (let dy = 0; dy < TILE && ty+dy < height; dy++)
        for (let dx = 0; dx < TILE && tx+dx < width; dx++) {
          const i = ((ty+dy)*width+(tx+dx))*4
          if (data[i+3] >= 128) tpx.push(rgbToLab(data[i], data[i+1], data[i+2]))
        }
      if (tpx.length < 4) continue
      totalCount++
      const n = tpx.length
      const mean: LabColor = {
        L: tpx.reduce((s,p)=>s+p.L,0)/n, a: tpx.reduce((s,p)=>s+p.a,0)/n,
        b: tpx.reduce((s,p)=>s+p.b,0)/n, r: tpx.reduce((s,p)=>s+p.r,0)/n,
        g: tpx.reduce((s,p)=>s+p.g,0)/n, bl: tpx.reduce((s,p)=>s+p.bl,0)/n,
      }
      const variance = tpx.reduce((s,p) => s + labDistance(p,mean)**2, 0) / n
      if (variance < VARLIM) flatCount++
    }
  }
  return totalCount > 0 && flatCount / totalCount > 0.50 ? 'graphic' : 'photo'
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function quantizeImage(
  grid:            PixelGrid,
  maxColors:       number,
  imageType:       ImageType = 'photo',
  backgroundColor: string    = '#ffffff'
): QuantizeResult {
  if (maxColors < 1 || maxColors > 256) throw new Error(`maxColors must be 1–256, got ${maxColors}`)
  const useTransparencyMask = hasTransparentPixels(grid)

  if (imageType === 'pixel') {
    // Frequency-based: most common colors win, no flood-fill, exact color preservation
    const palette  = pixelArtExtract(grid, maxColors)
    const colorMap = buildColorMap(grid, palette)
    return { palette, colorMap }
  }

  if (imageType === 'graphic') {
    let palette = kMeansExtract(grid, maxColors)
    palette = appendDistinctColorsToTarget(grid, palette, maxColors)
    let backgroundIndex: number | undefined
    if (useTransparencyMask) {
      const withBg = ensureBackgroundColorInPalette(palette, backgroundColor)
      palette = withBg.palette
      backgroundIndex = withBg.bgIndex
    }
    const colorMap = buildColorMap(grid, palette, backgroundIndex)
    return applyBackgroundPreference(grid, palette, colorMap, backgroundColor)
  }

  // Photo mode — pass backgroundColor so it always gets a dedicated slot
  let palette = saliencyMedianCut(grid, maxColors, backgroundColor)
  palette = appendDistinctColorsToTarget(grid, palette, maxColors)
  let backgroundIndex: number | undefined
  if (useTransparencyMask) {
    const withBg = ensureBackgroundColorInPalette(palette, backgroundColor)
    palette = withBg.palette
    backgroundIndex = withBg.bgIndex
  }
  const colorMap = buildColorMap(grid, palette, backgroundIndex)
  // NOTE: Do NOT call applyBackgroundPreference for photos.
  // That flood-fill uses EDGE_CANDIDATE_MIN=0.08 which treats any fur/skin
  // colour touching the frame as "background" and collapses the palette.
  // Transparent pixels are already correctly mapped to bgIndex above.
  return { palette, colorMap }
}

/**
 * For graphic images: build palette from the full-resolution source image
 * (where small text like "SPECIALTY, INC." is still readable), then assign
 * those colors to the already-resized pixelGrid.
 *
 * This solves the core black-text problem: at 40x40 the text is 1-2px tall
 * and gets blurred to grey by resampling. The full-res image still has true
 * black pixels that kMeansExtract can find as the darkest anchor.
 */
export async function buildPaletteFromFullRes(
  dataUrl:   string,
  pixelGrid: PixelGrid,
  maxColors: number
): Promise<QuantizeResult> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Sample full-res image at manageable size (400px max) to find palette
      const SAMPLE_SIZE = 400
      const scale = Math.min(1, SAMPLE_SIZE / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth  * scale)
      const h = Math.round(img.naturalHeight * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(quantizeImage(pixelGrid, maxColors, 'graphic')); return }

      ctx.drawImage(img, 0, 0, w, h)
      const fullResGrid: PixelGrid = {
        data:   ctx.getImageData(0, 0, w, h).data,
        width:  w,
        height: h,
      }

      // Find palette from full-res (black text is visible here)
      const palette  = kMeansExtract(fullResGrid, maxColors)
      // Assign those colors to the resized grid
      const colorMap = buildColorMap(pixelGrid, palette)
      resolve({ palette, colorMap })
    }
    img.onerror = () => resolve(quantizeImage(pixelGrid, maxColors, 'graphic'))
    img.src = dataUrl
  })
}

// ─── Full-size palette extraction for graphic mode ────────────────────────────

/**
 * Load image at full resolution, extract palette from it (so small black text
 * isn't lost to downsampling), then assign those colors to the small grid.
 */
export async function extractPaletteFromFullSize(
  dataUrl:   string,
  smallGrid: PixelGrid,
  maxColors: number,
  backgroundColor: string = '#ffffff'
): Promise<QuantizeResult> {
  const fullPixels = await new Promise<PixelGrid>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Use 800px for better text/detail preservation
      const scale  = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width  = Math.round(img.naturalWidth  * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no ctx')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve({ data: d.data, width: canvas.width, height: canvas.height })
    }
    img.onerror = () => reject(new Error('failed to load'))
    img.src = dataUrl
  })

  // Find palette from full-size pixels
  let palette = kMeansExtract(fullPixels, maxColors)
  palette = appendDistinctColorsToTarget(fullPixels, palette, maxColors)
  const useTransparencyMask = hasTransparentPixels(smallGrid)
  let backgroundIndex: number | undefined
  if (useTransparencyMask) {
    const withBg = ensureBackgroundColorInPalette(palette, backgroundColor)
    palette = withBg.palette
    backgroundIndex = withBg.bgIndex
  }
  const paletteLab = palette.map(e => rgbToLab(e.r, e.g, e.b))

  // For each grid cell, sample ALL full-res pixels in that region.
  // Find the DARKEST palette color that has at least MIN_VOTE_FRACTION
  // of pixels assigned to it — this ensures small but real features
  // like black text aren't drowned out by the surrounding color.
  const { width: sw, height: sh } = smallGrid
  const { width: fw, height: fh, data: fd } = fullPixels
  const colorMap = new Uint8Array(sw * sh)

  const scaleX = fw / sw
  const scaleY = fh / sh
  const MIN_VOTE_FRACTION = 0.15 // color needs 15% of pixels in region to win

  for (let row = 0; row < sh; row++) {
    for (let col = 0; col < sw; col++) {
      const fx0 = Math.floor(col * scaleX)
      const fy0 = Math.floor(row * scaleY)
      const fx1 = Math.min(fw, Math.ceil((col + 1) * scaleX))
      const fy1 = Math.min(fh, Math.ceil((row + 1) * scaleY))

      const votes   = new Int32Array(palette.length)
      let   total   = 0

      for (let fy = fy0; fy < fy1; fy++) {
        for (let fx = fx0; fx < fx1; fx++) {
          const i = (fy * fw + fx) * 4
          if (fd[i + 3] < 128) continue
          const lab = rgbToLab(fd[i], fd[i + 1], fd[i + 2])
          let bestIdx = 0, bestDist = Infinity
          for (let j = 0; j < paletteLab.length; j++) {
            const d = labDistance(lab, paletteLab[j])
            if (d < bestDist) { bestDist = d; bestIdx = j }
          }
          votes[bestIdx]++
          total++
        }
      }

      if (total === 0) {
        colorMap[row * sw + col] = typeof backgroundIndex === 'number' ? backgroundIndex : 0
        continue
      }

      // Perceptual significance vote:
      // Rather than pure majority, score each palette color by
      // votes × perceptual_importance. Dark colors and saturated colors
      // get a significance multiplier so thin strokes beat bland backgrounds.
      let winnerIdx  = 0
      let winnerScore = -1

      for (let j = 0; j < votes.length; j++) {
        if (votes[j] === 0) continue
        const jLab     = paletteLab[j]
        const fraction = votes[j] / total

        // Significance multiplier:
        // - Very dark (L<25): outlines/text — 4x weight
        // - Saturated (chroma>40): vivid fills — 2x weight
        // - Light/neutral: background — 1x weight
        const chroma   = Math.sqrt(jLab.a * jLab.a + jLab.b * jLab.b)
        const darkBoost = jLab.L < 25 ? 4 : jLab.L < 40 ? 2 : 1
        const satBoost  = chroma > 40 ? 2 : chroma > 20 ? 1.5 : 1
        const significance = Math.max(darkBoost, satBoost)

        // Still require a minimum presence to avoid single-pixel noise
        const minFrac = jLab.L < 25 ? 0.03 : 0.08
        if (fraction < minFrac) continue

        const score = fraction * significance
        if (score > winnerScore) { winnerScore = score; winnerIdx = j }
      }

      // Fallback to pure majority if no entry passed min threshold
      if (winnerScore < 0) {
        for (let j = 0; j < votes.length; j++) {
          if (votes[j] > (votes[winnerIdx] ?? 0)) winnerIdx = j
        }
      }

      const smallIdx = row * sw + col
      const alpha = smallGrid.data[smallIdx * 4 + 3]
      colorMap[smallIdx] =
        alpha < 220 && typeof backgroundIndex === 'number'
          ? backgroundIndex
          : winnerIdx
    }
  }

  return applyBackgroundPreference(smallGrid, palette, colorMap, backgroundColor)
}

/**
 * For photo images: extract palette from a larger version of the source image
 * (preserves subject detail that gets blurred in the tiny grid downsampling),
 * then map those colors to the small grid for the actual pattern.
 *
 * This mirrors what extractPaletteFromFullSize does for graphics.
 */
export async function quantizePhotoFromFullSize(
  dataUrl:         string,
  smallGrid:       PixelGrid,
  maxColors:       number,
  backgroundColor: string = '#ffffff'
): Promise<QuantizeResult> {
  // Sample the source image at a moderate size (300px max).
  // saliencyMedianCut on 600px creates up to 1.6M weighted pixels and freezes
  // the browser — kMeansExtract caps internally at 3 000 samples so it stays fast
  // while still reading far more colour detail than the tiny 40×50 grid.
  const fullPixels = await new Promise<PixelGrid>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale  = Math.min(1, 300 / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width  = Math.round(img.naturalWidth  * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no ctx')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve({ data: d.data, width: canvas.width, height: canvas.height })
    }
    img.onerror = () => reject(new Error('failed to load'))
    img.src = dataUrl
  })

  // kMeansExtract anchors on darkest + most-saturated pixels first (eyes, fur edges,
  // skin tone peaks) then fills remaining slots with k-means++ diversity — captures
  // photo detail without the O(n²) cost of saliency on large images.
  let palette = kMeansExtract(fullPixels, maxColors)
  palette = appendDistinctColorsToTarget(fullPixels, palette, maxColors)

  const useTransparencyMask = hasTransparentPixels(smallGrid)
  let backgroundIndex: number | undefined
  if (useTransparencyMask) {
    const withBg = ensureBackgroundColorInPalette(palette, backgroundColor)
    palette = withBg.palette
    backgroundIndex = withBg.bgIndex
  }
  const colorMap = buildColorMap(smallGrid, palette, backgroundIndex)
  // Do NOT call applyBackgroundPreference — flood-fill from edges eats subject detail
  return { palette, colorMap }
}
