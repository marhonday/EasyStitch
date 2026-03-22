'use client'

/**
 * components/preview/PatternCanvas.tsx
 *
 * Renders the pattern grid onto a canvas with pinch-to-zoom and pan.
 *
 * ZOOM TRAP FIX: The canvas only intercepts touch events when two fingers
 * are present (pinch) OR when the user has explicitly tapped to "enter"
 * the canvas. A single-finger scroll always passes through to the page.
 * This prevents users from getting stuck inside the canvas on mobile.
 *
 * UX flow:
 * - Single finger scroll → page scrolls normally (touch events NOT prevented)
 * - Two finger pinch → zoom canvas (touch events prevented)
 * - Tap canvas once → enters "zoom mode", shows "Tap to exit" hint
 * - Tap hint or anywhere outside → exits zoom mode, page scrolls again
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { PatternData, ColorEntry } from '@/types/pattern'
import {
  drawPatternToCanvas,
  computeCanvasSize,
  PREVIEW_DEFAULTS,
} from '@/modules/preview-rendering/canvasRenderer'

interface PatternCanvasProps {
  pattern:         PatternData
  cellSize?:       number
  className?:      string
  cellOverrides?:  Map<string, number>
  paletteOverrides?: ColorEntry[]   // swapped palette colors — redraws without zoom reset
  onCellTap?:      (row: number, col: number, screenX: number, screenY: number) => void
}

interface Transform {
  scale: number
  x:     number
  y:     number
}

const MIN_SCALE = 0.5
const MAX_SCALE = 5.0
const INITIAL_TRANSFORM: Transform = { scale: 1, x: 0, y: 0 }

function touchDistance(t: React.TouchList): number {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function touchMidpoint(t: React.TouchList): { x: number; y: number } {
  return {
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  }
}

function applyOverrides(
  pattern:         PatternData,
  cellOverrides:   Map<string, number>,
  paletteOverrides?: ColorEntry[]
): PatternData {
  const palette = paletteOverrides ?? pattern.palette
  const newGrid = pattern.grid.map((row, r) =>
    row.map((cell, c) => {
      const key        = `${r},${c}`
      const colorIndex = cellOverrides.get(key) ?? cell.colorIndex
      return { colorIndex, symbol: palette[colorIndex]?.symbol ?? cell.symbol }
    })
  )
  return { ...pattern, palette, grid: newGrid }
}

export default function PatternCanvas({
  pattern,
  cellSize = PREVIEW_DEFAULTS.cellSize,
  className,
  cellOverrides,
  paletteOverrides,
  onCellTap,
}: PatternCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tfRef      = useRef<Transform>(INITIAL_TRANSFORM)

  // Gesture state refs — no setState so no re-renders during gesture
  const pinchDistRef  = useRef<number | null>(null)
  const panPointRef   = useRef<{ x: number; y: number } | null>(null)
  const isPinchingRef = useRef(false)
  const lastTapRef    = useRef<number>(0)

  // Whether the user has "entered" the canvas for zoom/pan interaction
  // When false, single-finger touch passes through to the page scroller
  const [zoomMode, setZoomMode] = useState(false)
  const zoomModeRef = useRef(false) // sync ref for use inside touch handlers

  useEffect(() => {
    zoomModeRef.current = zoomMode
  }, [zoomMode])

  // Draw on pattern change
  function getPatternToRender() {
    const hasOverrides = (cellOverrides && cellOverrides.size > 0) || paletteOverrides
    if (!hasOverrides) return pattern
    return applyOverrides(pattern, cellOverrides ?? new Map(), paletteOverrides)
  }

  // Reset transform and redraw only when the base pattern or cellSize changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pattern) return
    const showSymbols = tfRef.current.scale >= 2.5 && cellSize >= 10
    drawPatternToCanvas(canvas, getPatternToRender(), { cellSize, gap: 1, showSymbols })
    tfRef.current = INITIAL_TRANSFORM
    applyTransform()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, cellSize])

  // Redraw without zoom reset when overrides change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pattern) return
    const showSymbols = tfRef.current.scale >= 2.5 && cellSize >= 10
    drawPatternToCanvas(canvas, getPatternToRender(), { cellSize, gap: 1, showSymbols })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellOverrides, paletteOverrides])

  const applyTransform = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const { scale, x, y } = tfRef.current
    el.style.transform       = `translate(${x}px, ${y}px) scale(${scale})`
    el.style.transformOrigin = '0 0'
  }, [])

  const redrawForZoom = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !pattern) return
    const showSymbols = tfRef.current.scale >= 2.5 && cellSize >= 10
    drawPatternToCanvas(canvas, getPatternToRender(), { cellSize, gap: 1, showSymbols })
  }, [pattern, cellSize, cellOverrides, paletteOverrides])

  const exitZoomMode = useCallback(() => {
    setZoomMode(false)
    zoomModeRef.current = false
    tfRef.current = INITIAL_TRANSFORM
    applyTransform()
    redrawForZoom()
  }, [applyTransform, redrawForZoom])

  // Touch start — only intercept if pinching OR already in zoom mode
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger pinch always enters zoom mode
      e.preventDefault()
      isPinchingRef.current = true
      pinchDistRef.current  = touchDistance(e.touches)
      panPointRef.current   = null
      if (!zoomModeRef.current) {
        setZoomMode(true)
        zoomModeRef.current = true
      }
    } else if (e.touches.length === 1) {
      if (zoomModeRef.current) {
        // In zoom mode — track for panning
        panPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      // If NOT in zoom mode — don't preventDefault, let page scroll
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      e.preventDefault()
      const newDist  = touchDistance(e.touches)
      const mid      = touchMidpoint(e.touches)
      const delta    = newDist / pinchDistRef.current
      const t        = tfRef.current
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * delta))
      const ratio    = newScale / t.scale
      tfRef.current      = { scale: newScale, x: mid.x - ratio * (mid.x - t.x), y: mid.y - ratio * (mid.y - t.y) }
      pinchDistRef.current = newDist
      applyTransform()
    } else if (e.touches.length === 1 && panPointRef.current && !isPinchingRef.current && zoomModeRef.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - panPointRef.current.x
      const dy = e.touches[0].clientY - panPointRef.current.y
      tfRef.current    = { ...tfRef.current, x: tfRef.current.x + dx, y: tfRef.current.y + dy }
      panPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      applyTransform()
    }
    // Single finger NOT in zoom mode — no preventDefault, page scrolls
  }, [applyTransform])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false
      pinchDistRef.current  = null
      redrawForZoom()
    }
    if (e.touches.length === 0) {
      const touch = e.changedTouches[0]
      panPointRef.current = null

      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current

      // Double-tap to reset zoom
      if (timeSinceLastTap < 300 && zoomModeRef.current) {
        exitZoomMode()
      } else if (timeSinceLastTap > 300 && zoomModeRef.current && !isPinchingRef.current && onCellTap) {
        // Single tap in zoom mode = cell edit
        const cell = screenToCell(touch.clientX, touch.clientY)
        if (cell) onCellTap(cell.row, cell.col, touch.clientX, touch.clientY)
      }
      lastTapRef.current = now
    }
  }, [redrawForZoom, exitZoomMode, onCellTap, screenToCell])

  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const rect   = wrapper.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta  = e.deltaY > 0 ? 0.9 : 1.1
    const t      = tfRef.current
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * delta))
    const ratio    = newScale / t.scale
    tfRef.current = {
      scale: newScale,
      x: mouseX - ratio * (mouseX - t.x),
      y: mouseY - ratio * (mouseY - t.y),
    }
    applyTransform()
    redrawForZoom()
  }, [applyTransform, redrawForZoom])

  // Mouse drag pan (desktop)
  const mouseDragRef = useRef<{ x: number; y: number } | null>(null)

  // Track whether a mouse/touch moved enough to be a drag vs a tap
  const tapStartRef  = useRef<{ x: number; y: number } | null>(null)
  const draggedRef   = useRef(false)

  // Convert screen coordinates to grid cell
  function screenToCell(screenX: number, screenY: number): { row: number; col: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect   = canvas.getBoundingClientRect()
    const tf     = tfRef.current
    const stride = cellSize + 1
    // Account for the wrapper transform
    const localX = (screenX - rect.left) / tf.scale
    const localY = (screenY - rect.top)  / tf.scale
    const col    = Math.floor(localX / stride)
    const row    = Math.floor(localY / stride)
    if (row < 0 || row >= pattern.meta.height || col < 0 || col >= pattern.meta.width) return null
    return { row, col }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDragRef.current = { x: e.clientX, y: e.clientY }
    tapStartRef.current  = { x: e.clientX, y: e.clientY }
    draggedRef.current   = false
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDragRef.current) return
    const dx = e.clientX - mouseDragRef.current.x
    const dy = e.clientY - mouseDragRef.current.y
    // Mark as drag if moved more than 4px
    if (Math.abs(e.clientX - (tapStartRef.current?.x ?? 0)) > 4 ||
        Math.abs(e.clientY - (tapStartRef.current?.y ?? 0)) > 4) {
      draggedRef.current = true
    }
    tfRef.current = { ...tfRef.current, x: tfRef.current.x + dx, y: tfRef.current.y + dy }
    mouseDragRef.current = { x: e.clientX, y: e.clientY }
    applyTransform()
  }, [applyTransform])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // If barely moved = tap → cell edit
    if (!draggedRef.current && onCellTap && e.button === 0) {
      const cell = screenToCell(e.clientX, e.clientY)
      if (cell) onCellTap(cell.row, cell.col, e.clientX, e.clientY)
    }
    mouseDragRef.current = null
    tapStartRef.current  = null
  }, [onCellTap, screenToCell])

  // Attach wheel listener with non-passive flag so we can preventDefault
  useEffect(() => {
    const el = wrapperRef.current?.parentElement
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const { width, height } = computeCanvasSize(pattern, { cellSize, gap: 1, showSymbols: false })

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          overflow:         'hidden',
          borderRadius:     16,
          background:       '#F2EAD8',
          touchAction:      zoomMode ? 'none' : 'pan-y',
          cursor:           mouseDragRef.current ? 'grabbing' : 'grab',
          userSelect:       'none',
          WebkitUserSelect: 'none',
          position:         'relative',
        }}
        className={className}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div ref={wrapperRef} style={{ display: 'inline-block', willChange: 'transform' }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ display: 'block' }}
            aria-label={`Crochet pattern grid, ${pattern.meta.width} by ${pattern.meta.height} stitches`}
          />
        </div>
      </div>

      {/* Zoom mode indicator + exit button */}
      {zoomMode && (
        <button
          onClick={exitZoomMode}
          style={{
            position:     'absolute',
            bottom:       8,
            right:        8,
            background:   'rgba(44,34,24,0.75)',
            color:        'white',
            border:       'none',
            borderRadius: 20,
            padding:      '5px 12px',
            fontSize:     11,
            fontFamily:   "'DM Sans', sans-serif",
            cursor:       'pointer',
            backdropFilter: 'blur(4px)',
            zIndex:       10,
          }}
        >
          ✕ Exit zoom
        </button>
      )}

      {/* Hint */}
      {!zoomMode && (
        <div style={{
          textAlign:  'center',
          fontSize:   11,
          color:      'rgba(107,87,68,0.5)',
          fontFamily: "'DM Sans', sans-serif",
          marginTop:  6,
        }}>
          Scroll to zoom · Drag to pan · Tap cell to edit colour
        </div>
      )}
      {zoomMode && onCellTap && (
        <div style={{
          textAlign:  'center',
          fontSize:   11,
          color:      'rgba(107,87,68,0.5)',
          fontFamily: "'DM Sans', sans-serif",
          marginTop:  6,
        }}>
          Tap a cell to change its colour
        </div>
      )}
    </div>
  )
}
