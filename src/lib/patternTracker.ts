import { PatternData, StitchStyle } from '@/types/pattern'

export const TRACKER_SYMBOLS = ['■','●','▲','◆','★','✿','❤','◉','⬟','⬡','⊕','⊗','▼','◀','▶','▽','△','○','□','◇','☆','✦','✧','✩','✪']

export interface TrackedPalette {
  hex:    string
  symbol: string
  label?: string
}

export interface TrackedPattern {
  id:           string
  name:         string
  createdAt:    number
  updatedAt:    number
  colorMap:     number[][]
  palette:      TrackedPalette[]
  emailSaved?:  boolean
  yarnLabels?:  Record<number, string>
  meta: {
    width:          number
    height:         number
    stitchStyle:    StitchStyle
    source:         'uploaded' | 'generated'
    gridLineColor?: string
  }
  progress: {
    completedRows: number[]
    currentRow:    number
  }
}

const KEY = 'easystitch_tracker_v1'

function loadAll(): TrackedPattern[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TrackedPattern[]) : []
  } catch { return [] }
}

function saveAll(all: TrackedPattern[]): void {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getAllTracked(): TrackedPattern[] {
  return loadAll()
}

export function getTracked(id: string): TrackedPattern | null {
  return loadAll().find(p => p.id === id) ?? null
}

export function saveTracked(pattern: TrackedPattern): void {
  const all = loadAll()
  const idx = all.findIndex(p => p.id === pattern.id)
  if (idx >= 0) all[idx] = { ...pattern, updatedAt: Date.now() }
  else all.unshift(pattern)
  saveAll(all)
}

export function deleteTracked(id: string): void {
  saveAll(loadAll().filter(p => p.id !== id))
}

export function markEmailSaved(id: string): void {
  const all = loadAll()
  const p = all.find(p => p.id === id)
  if (!p) return
  p.emailSaved = true
  p.updatedAt  = Date.now()
  saveAll(all)
}

export function defaultYarnLabel(i: number): string {
  return `Color ${String.fromCharCode(65 + i)}`
}

export function updateYarnLabel(id: string, colorIndex: number, label: string): void {
  const all = loadAll()
  const p = all.find(p => p.id === id)
  if (!p) return
  if (!p.yarnLabels) p.yarnLabels = {}
  p.yarnLabels[colorIndex] = label
  p.updatedAt = Date.now()
  saveAll(all)
}

export function updateProgress(id: string, completedRows: number[], currentRow: number): void {
  const all = loadAll()
  const p = all.find(p => p.id === id)
  if (!p) return
  p.progress = { completedRows, currentRow }
  p.updatedAt = Date.now()
  saveAll(all)
}

export function patternFromPatternData(data: PatternData, name: string): TrackedPattern {
  const colorMap = data.grid.map(row => row.map(cell => cell.colorIndex))
  const palette: TrackedPalette[] = data.palette.map(e => ({
    hex:    e.hex,
    symbol: e.symbol,
    label:  e.label,
  }))
  return {
    id:        `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    colorMap,
    palette,
    meta: {
      width:       data.meta.width,
      height:      data.meta.height,
      stitchStyle: data.meta.stitchStyle,
      source:      'generated',
    },
    progress: { completedRows: [], currentRow: 0 },
  }
}

export function patternFromDetection(
  colorMap:       number[][],
  palette:        TrackedPalette[],
  width:          number,
  height:         number,
  name:           string,
  stitchStyle:    StitchStyle,
  gridLineColor?: string,
): TrackedPattern {
  return {
    id:        `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    colorMap,
    palette,
    meta: { width, height, stitchStyle, source: 'uploaded', gridLineColor },
    progress: { completedRows: [], currentRow: 0 },
  }
}
