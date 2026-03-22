'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

type Handle = 'tl'|'tr'|'bl'|'br'|'move'|null
type Box = { x: number; y: number; w: number; h: number }

interface CropToolProps {
  imageUrl:  string
  onConfirm: (croppedDataUrl: string) => void
  onSkip:    () => void
}

const MIN_PX = 30

export default function CropTool({ imageUrl, onConfirm, onSkip }: CropToolProps) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const imgRef    = useRef<HTMLImageElement>(null)
  const [ready,   setReady]   = useState(false)
  const [box,     setBox]     = useState<Box>({ x: 0, y: 0, w: 0, h: 0 })
  const drag = useRef<{ handle: Handle; sx: number; sy: number; sb: Box } | null>(null)

  // Get the image's rendered rect — single source of truth
  const getImgRect = () => imgRef.current?.getBoundingClientRect() ?? new DOMRect()

  function onImgLoad() {
    requestAnimationFrame(() => {
      const img = imgRef.current
      if (!img) return
      const w = img.clientWidth
      const h = img.clientHeight
      if (!w || !h) return
      // Default to full image — user drags inward to crop
      setBox({ x: 0, y: 0, w, h })
      setReady(true)
    })
  }

  function pt(e: MouseEvent | TouchEvent) {
    const img = imgRef.current!
    const r   = img.getBoundingClientRect()
    const s   = 'touches' in e ? e.touches[0] : e as MouseEvent
    return {
      x:  s.clientX - r.left,
      y:  s.clientY - r.top,
      rw: img.clientWidth,
      rh: img.clientHeight,
    }
  }

  function startDrag(handle: Handle, e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); e.stopPropagation()
    const s = 'nativeEvent' in e
      ? ('touches' in e.nativeEvent
        ? (e.nativeEvent as TouchEvent).touches[0]
        : e.nativeEvent as MouseEvent)
      : e as unknown as MouseEvent
    const r = getImgRect()
    drag.current = { handle, sx: s.clientX - r.left, sy: s.clientY - r.top, sb: { ...box } }
  }

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drag.current) return
    e.preventDefault()
    const { handle, sx, sy, sb } = drag.current
    const { x: mx, y: my, rw, rh } = pt(e)
    const dx = mx - sx, dy = my - sy

    setBox(() => {
      let { x, y, w, h } = sb
      if (handle === 'move') {
        x = Math.max(0, Math.min(rw - w, x + dx))
        y = Math.max(0, Math.min(rh - h, y + dy))
      } else if (handle === 'tl') {
        const nx = Math.max(0, Math.min(x + w - MIN_PX, x + dx))
        const ny = Math.max(0, Math.min(y + h - MIN_PX, y + dy))
        w += x - nx; h += y - ny; x = nx; y = ny
      } else if (handle === 'tr') {
        w = Math.min(rw - x, Math.max(MIN_PX, w + dx))
        const ny = Math.max(0, Math.min(y + h - MIN_PX, y + dy))
        h += y - ny; y = ny
      } else if (handle === 'bl') {
        const nx = Math.max(0, Math.min(x + w - MIN_PX, x + dx))
        w += x - nx; x = nx
        h = Math.min(rh - y, Math.max(MIN_PX, h + dy))
      } else if (handle === 'br') {
        w = Math.min(rw - x, Math.max(MIN_PX, w + dx))
        h = Math.min(rh - y, Math.max(MIN_PX, h + dy))
      }
      // Snap to edges within 12px
      const SNAP = 12
      if (x < SNAP) x = 0
      if (y < SNAP) y = 0
      if (x + w > rw - SNAP) w = rw - x
      if (y + h > rh - SNAP) h = rh - y
      return { x, y, w, h }
    })
  }, [])

  const onEnd = useCallback(() => { drag.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onEnd)
    }
  }, [onMove, onEnd])

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    const dispW = img.clientWidth
    const dispH = img.clientHeight
    const natW  = img.naturalWidth
    const natH  = img.naturalHeight
    if (!dispW || !dispH || !natW || !natH) return

    const sx = Math.round(box.x * natW / dispW)
    const sy = Math.round(box.y * natH / dispH)
    const sw = Math.max(1, Math.round(box.w * natW / dispW))
    const sh = Math.max(1, Math.round(box.h * natH / dispH))

    const canvas = document.createElement('canvas')
    canvas.width = sw; canvas.height = sh
    canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    onConfirm(canvas.toDataURL('image/jpeg', 0.92))
  }

  const HS = 24
  const hs = (cur: string): React.CSSProperties => ({
    position: 'absolute', width: HS, height: HS, borderRadius: 6,
    background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    cursor: cur, touchAction: 'none', zIndex: 20,
    transform: 'translate(-50%,-50%)', pointerEvents: 'all',
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#111' }}>
      <div style={{ padding:'10px 16px', textAlign:'center', flexShrink:0 }}>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.75)', margin:0 }}>
          Drag corners to crop around your subject
        </p>
      </div>

      <div ref={wrapRef} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#111', position:'relative' }}>
        {/* Image fills wrapper naturally — no explicit size set */}
        <div style={{ position:'relative', display:'inline-block', lineHeight:0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="crop"
            onLoad={onImgLoad}
            draggable={false}
            style={{ maxWidth:'100%', maxHeight:'calc(100vh - 200px)', display:'block', userSelect:'none' }}
          />

          {ready && (
            <>
              <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:5, overflow:'visible' }}>
                <defs>
                  <mask id="cmask">
                    <rect width="100%" height="100%" fill="white"/>
                    <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="black"/>
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cmask)"/>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="white" strokeWidth="2"/>
                {[1,2].map(i => <line key={`v${i}`} x1={box.x+box.w*i/3} y1={box.y} x2={box.x+box.w*i/3} y2={box.y+box.h} stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>)}
                {[1,2].map(i => <line key={`h${i}`} x1={box.x} y1={box.y+box.h*i/3} x2={box.x+box.w} y2={box.y+box.h*i/3} stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>)}
              </svg>

              <div style={{ position:'absolute', left:box.x, top:box.y, width:box.w, height:box.h, cursor:'move', touchAction:'none', zIndex:10 }}
                onMouseDown={e => startDrag('move', e)} onTouchStart={e => startDrag('move', e)}/>

              {([['tl','nw-resize',0,0],['tr','ne-resize',1,0],['bl','sw-resize',0,1],['br','se-resize',1,1]] as [Handle,string,number,number][]).map(
                ([id, cur, fx, fy]) => (
                  <div key={id as string} style={{ ...hs(cur), left: box.x+fx*box.w, top: box.y+fy*box.h }}
                    onMouseDown={e => startDrag(id, e)} onTouchStart={e => startDrag(id, e)}/>
                )
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ padding:'14px 20px', display:'flex', gap:10, flexShrink:0 }}>
        <button onClick={onSkip} style={{ flex:1, padding:'14px', borderRadius:14, background:'rgba(255,255,255,0.1)', color:'white', border:'1.5px solid rgba(255,255,255,0.2)', fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:'pointer' }}>
          Skip
        </button>
        <button onClick={() => { console.log('CONFIRM CLICKED', box, imgRef.current?.naturalWidth, imgRef.current?.naturalHeight); handleConfirm() }} style={{ flex:2, padding:'14px', borderRadius:14, background:'#C4614A', color:'white', border:'none', fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 16px rgba(196,97,74,0.35)' }}>
          Use this crop →
        </button>
      </div>
    </div>
  )
}
