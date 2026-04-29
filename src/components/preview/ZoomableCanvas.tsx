'use client'

import { RefObject, useRef, useCallback, useEffect } from 'react'

interface ZoomableCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement>
  label?: string
  showRowHint?: boolean
}

interface Transform { scale: number; x: number; y: number }

const INITIAL: Transform = { scale: 1, x: 0, y: 0 }
const MIN_SCALE = 0.5
const MAX_SCALE = 5.0

function touchDist(t: React.TouchList): number {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export default function ZoomableCanvas({ canvasRef, label, showRowHint }: ZoomableCanvasProps) {
  const outerRef    = useRef<HTMLDivElement>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)
  const tfRef       = useRef<Transform>({ ...INITIAL })

  // Mouse pan
  const mouseDragRef = useRef<{ x: number; y: number } | null>(null)
  const tapStartRef  = useRef<{ x: number; y: number } | null>(null)
  const draggedRef   = useRef(false)

  // Touch pinch/pan
  const pinchDistRef  = useRef<number | null>(null)
  const panTouchRef   = useRef<{ x: number; y: number } | null>(null)
  const isPinchingRef = useRef(false)
  const lastTapRef    = useRef<number>(0)

  const applyTransform = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const { scale, x, y } = tfRef.current
    el.style.transform       = `translate(${x}px, ${y}px) scale(${scale})`
    el.style.transformOrigin = '0 0'
  }, [])

  // Wheel zoom (desktop)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const outer = outerRef.current
    if (!outer) return
    const rect    = outer.getBoundingClientRect()
    const mouseX  = e.clientX - rect.left
    const mouseY  = e.clientY - rect.top
    const delta   = e.deltaY > 0 ? 0.9 : 1.1
    const t       = tfRef.current
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * delta))
    const ratio    = newScale / t.scale
    tfRef.current  = { scale: newScale, x: mouseX - ratio * (mouseX - t.x), y: mouseY - ratio * (mouseY - t.y) }
    applyTransform()
  }, [applyTransform])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDragRef.current = { x: e.clientX, y: e.clientY }
    tapStartRef.current  = { x: e.clientX, y: e.clientY }
    draggedRef.current   = false
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDragRef.current) return
    if (
      Math.abs(e.clientX - (tapStartRef.current?.x ?? 0)) > 4 ||
      Math.abs(e.clientY - (tapStartRef.current?.y ?? 0)) > 4
    ) draggedRef.current = true
    const dx = e.clientX - mouseDragRef.current.x
    const dy = e.clientY - mouseDragRef.current.y
    tfRef.current        = { ...tfRef.current, x: tfRef.current.x + dx, y: tfRef.current.y + dy }
    mouseDragRef.current = { x: e.clientX, y: e.clientY }
    applyTransform()
  }, [applyTransform])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedRef.current) e.stopPropagation()
    mouseDragRef.current = null
    tapStartRef.current  = null
  }, [])

  // Touch pinch zoom + drag pan + double-tap reset
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      pinchDistRef.current  = touchDist(e.touches)
      isPinchingRef.current = true
      panTouchRef.current   = null
    } else if (e.touches.length === 1) {
      panTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      e.preventDefault()
      const newDist = touchDist(e.touches)
      const mid     = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
      const delta    = newDist / pinchDistRef.current
      const t        = tfRef.current
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * delta))
      const ratio    = newScale / t.scale
      tfRef.current       = { scale: newScale, x: mid.x - ratio * (mid.x - t.x), y: mid.y - ratio * (mid.y - t.y) }
      pinchDistRef.current = newDist
      applyTransform()
    } else if (e.touches.length === 1 && panTouchRef.current && !isPinchingRef.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - panTouchRef.current.x
      const dy = e.touches[0].clientY - panTouchRef.current.y
      tfRef.current   = { ...tfRef.current, x: tfRef.current.x + dx, y: tfRef.current.y + dy }
      panTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      applyTransform()
    }
  }, [applyTransform])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false
      pinchDistRef.current  = null
    }
    if (e.touches.length === 0) {
      panTouchRef.current = null
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        tfRef.current = { ...INITIAL }
        applyTransform()
      }
      lastTapRef.current = now
    }
  }, [applyTransform])

  return (
    <div style={{ width: '100%', background: 'white', borderRadius: 20, padding: 12, boxShadow: '0 2px 16px rgba(44,34,24,0.08)' }}>
      {label && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 8 }}>
          {label}
        </p>
      )}

      <div
        ref={outerRef}
        style={{
          overflow:         'hidden',
          borderRadius:     12,
          position:         'relative',
          touchAction:      'none',
          cursor:           'grab',
          userSelect:       'none',
          WebkitUserSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={wrapperRef} style={{ display: 'inline-block', willChange: 'transform' }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', imageRendering: 'pixelated' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   10,
          color:      showRowHint ? '#C4614A' : 'transparent',
          flex:       1,
        }}>
          ← Highlighted row = current row in tracker below
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(107,87,68,0.45)', flexShrink: 0 }}>
          Scroll to zoom · Drag to pan · Double-tap to reset
        </p>
      </div>
    </div>
  )
}
