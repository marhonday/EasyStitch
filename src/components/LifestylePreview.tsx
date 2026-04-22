'use client'

/**
 * LifestylePreview
 *
 * Shows the pattern composited onto lifestyle mockup photos so users can
 * visualise how their finished project would look in a real setting.
 *
 * Usage:
 *   <LifestylePreview patternCanvas={canvasRef} />
 *
 * patternCanvas — a ref to the rendered pattern <canvas> element.
 * The component grabs the current canvas frame as a data URL and
 * composites it onto whichever scene the user selects.
 */

import { useRef, useState, useEffect, RefObject } from 'react'
import { MOCKUP_SCENES, MockupScene, compositeMockup } from '@/lib/lifestyleMockup'

interface Props {
  /** Ref to the pattern canvas already rendered on the export page */
  patternCanvas: RefObject<HTMLCanvasElement | null>
  /** Optional extra style on the outer wrapper */
  style?: React.CSSProperties
}

type GenStatus = 'idle' | 'loading' | 'done' | 'error' | 'no-photo'

export default function LifestylePreview({ patternCanvas, style }: Props) {
  const [activeScene,  setActiveScene]  = useState<MockupScene>(MOCKUP_SCENES[0])
  const [status,       setStatus]       = useState<GenStatus>('idle')
  const [resultUrl,    setResultUrl]    = useState<string | null>(null)
  const [errorMsg,     setErrorMsg]     = useState<string>('')

  // Re-generate whenever the selected scene changes (if we already have a result)
  const hasGenerated = useRef(false)

  async function generate(scene: MockupScene) {
    const canvas = patternCanvas.current
    if (!canvas) return

    setStatus('loading')
    setResultUrl(null)
    setErrorMsg('')

    try {
      const patternUrl = canvas.toDataURL('image/png')
      const url = await compositeMockup(scene, patternUrl, 800)
      setResultUrl(url)
      setStatus('done')
      hasGenerated.current = true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Most likely cause: photo not found yet
      if (msg.includes('404') || msg.toLowerCase().includes('load')) {
        setStatus('no-photo')
        setErrorMsg('Photo not added yet — drop the mockup image in /public/mockups/ to activate this scene.')
      } else {
        setStatus('error')
        setErrorMsg('Could not generate preview. Try again.')
      }
    }
  }

  function handleSceneClick(scene: MockupScene) {
    setActiveScene(scene)
    if (hasGenerated.current) generate(scene)
  }

  return (
    <div style={{ width: '100%', background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)', ...style }}>

      {/* Header */}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
        Picture it
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 12 }}>
        See how your finished project could look in a real setting
      </p>

      {/* Scene picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {MOCKUP_SCENES.map(scene => (
          <button
            key={scene.id}
            onClick={() => handleSceneClick(scene)}
            style={{
              padding: '7px 12px', borderRadius: 20, cursor: 'pointer',
              border: activeScene.id === scene.id ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
              background: activeScene.id === scene.id ? '#FFF3EE' : 'white',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              color: activeScene.id === scene.id ? '#C4614A' : '#6B5744',
            }}
          >
            {scene.emoji} {scene.label}
          </button>
        ))}
      </div>

      {/* Result area */}
      {status === 'idle' && (
        <button
          onClick={() => generate(activeScene)}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, cursor: 'pointer',
            border: '1.5px dashed #D4C4B0', background: '#FAF6EF',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            color: '#9A8878', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          ✨ Generate lifestyle preview
        </button>
      )}

      {status === 'loading' && (
        <div style={{ width: '100%', padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#FAF6EF', borderRadius: 12 }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(196,97,74,0.3)', borderTopColor: '#C4614A', animation: 'ls-spin 0.8s linear infinite', display: 'inline-block' }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>Compositing scene…</p>
        </div>
      )}

      {status === 'done' && resultUrl && (
        <div>
          <img
            src={resultUrl}
            alt={`Pattern styled as ${activeScene.label}`}
            style={{ width: '100%', borderRadius: 12, display: 'block' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
              This is a preview — actual result depends on stitch size &amp; yarn
            </p>
            <button
              onClick={() => generate(activeScene)}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', cursor: 'pointer', fontWeight: 600 }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {status === 'no-photo' && (
        <div style={{ background: '#FFF8F0', borderRadius: 12, padding: '14px 16px', border: '1px dashed #E4C9A8' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.6 }}>
            📸 {errorMsg}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '12px 16px' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A' }}>{errorMsg}</p>
          <button
            onClick={() => generate(activeScene)}
            style={{ marginTop: 8, background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', cursor: 'pointer', fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      )}

      <style>{`@keyframes ls-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
