'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePbnPattern } from '@/context/PbnPatternContext'
import { logEvent } from '@/lib/log'

type Status = 'idle' | 'generating' | 'done' | 'error'

const SIZE_PRESETS = [
  { label: 'Small',  width: 60,  height: 45,  note: '~A5 print' },
  { label: 'Medium', width: 80,  height: 60,  note: '~A4 print' },
  { label: 'Large',  width: 100, height: 75,  note: '~A3 print' },
  { label: 'Square', width: 80,  height: 80,  note: 'Canvas format' },
]

export default function PbnSettingsPage() {
  const router = useRouter()
  const { state, dispatch } = usePbnPattern()
  const { rawImage, settings } = state

  const [status, setStatus] = useState<Status>('idle')
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!rawImage) router.replace('/pbn')
  }, [rawImage, router])

  if (!rawImage) return null

  const activePreset = SIZE_PRESETS.find(p => p.width === settings.width && p.height === settings.height)

  async function handleGenerate() {
    if (!rawImage) return
    logEvent('GENERATION_STARTED', 'paint-by-number')
    setStatus('generating')
    setError(null)
    try {
      const { generatePattern } = await import('@/modules/pattern-engine/generatePattern')
      const result = await generatePattern(rawImage, {
        stitchStyle:     'singleCrochet',
        gridSize:        { label: 'Custom', width: settings.width, height: settings.height },
        maxColors:       settings.colorCount,
        imageType:       settings.imageType,
        backgroundColor: '#ffffff',
        borderLayers:    [],
      })
      dispatch({ type: 'SET_PATTERN', payload: result })
      setStatus('done')
      router.push('/pbn/export')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Try again.')
      setStatus('generating')
      setStatus('error')
    }
  }

  const busy = status === 'generating'

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button
          onClick={() => router.push('/pbn')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}
        >
          ← Photo
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Settings</p>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 140px', gap: 16, maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Photo preview */}
        <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(44,34,24,0.08)', maxHeight: 180 }}>
          <img src={rawImage} alt="Your photo" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
        </div>

        {/* Canvas size */}
        <div style={{ width: '100%', background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Canvas size
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SIZE_PRESETS.map(preset => {
              const active = activePreset?.label === preset.label
              return (
                <button
                  key={preset.label}
                  onClick={() => dispatch({ type: 'SET_SETTINGS', payload: { width: preset.width, height: preset.height } })}
                  style={{
                    padding: '12px 10px', borderRadius: 12, border: active ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
                    background: active ? '#FFF3EE' : 'white', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: active ? '#C4614A' : '#2C2218', marginBottom: 2 }}>
                    {preset.label}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                    {preset.width}×{preset.height} · {preset.note}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Custom size */}
          {!activePreset && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', marginTop: 10, textAlign: 'center' }}>
              Custom: {settings.width}×{settings.height}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {[
              { label: 'Width',  key: 'width'  as const },
              { label: 'Height', key: 'height' as const },
            ].map(({ label, key }) => (
              <div key={key} style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>{label}</p>
                <input
                  type="number"
                  min={20} max={200}
                  value={settings[key]}
                  onChange={e => dispatch({ type: 'SET_SETTINGS', payload: { [key]: Math.max(20, Math.min(200, +e.target.value)) } })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Number of colours */}
        <div style={{ width: '100%', background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Paint colours
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>
              {settings.colorCount}
            </p>
          </div>
          <input
            type="range" min={3} max={16} value={settings.colorCount}
            onChange={e => dispatch({ type: 'SET_SETTINGS', payload: { colorCount: +e.target.value } })}
            style={{ width: '100%', accentColor: '#C4614A' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>3 — very simple</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>16 — very detailed</p>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginTop: 10, lineHeight: 1.6 }}>
            {settings.colorCount <= 5
              ? 'Great for beginners and bold graphic images.'
              : settings.colorCount <= 10
              ? 'Good for most portraits and landscapes.'
              : 'Use for complex photos where fine colour detail matters.'}
          </p>
        </div>

        {/* Image type */}
        <div style={{ width: '100%', background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Image type
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['photo', 'graphic'] as const).map(val => (
              <button
                key={val}
                onClick={() => dispatch({ type: 'SET_SETTINGS', payload: { imageType: val } })}
                style={{
                  flex: 1, padding: '11px 8px', borderRadius: 12,
                  border: settings.imageType === val ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
                  background: settings.imageType === val ? '#FFF3EE' : 'white',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  color: settings.imageType === val ? '#C4614A' : '#6B5744',
                  cursor: 'pointer',
                }}
              >
                {val === 'photo' ? '📷 Photo' : '🎨 Graphic / Logo'}
              </button>
            ))}
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 8 }}>
            {settings.imageType === 'photo'
              ? 'Portraits, landscapes, animals — use photo mode.'
              : 'Logos, illustrations, flat art — use graphic mode.'}
          </p>
        </div>

        {error && (
          <div style={{ width: '100%', background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

      </div>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to bottom, transparent, #FAF6EF 35%)', padding: '16px 20px max(24px, env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button
            onClick={handleGenerate}
            disabled={busy}
            style={{
              width: '100%', padding: '15px',
              background: busy ? '#E4D9C8' : '#C4614A',
              color: busy ? '#B8AAA0' : 'white',
              border: 'none', borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: busy ? 'none' : '0 4px 20px rgba(196,97,74,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {busy ? (
              <>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'pbn-spin 0.8s linear infinite', display: 'inline-block' }} />
                Generating pattern…
              </>
            ) : '🎨 Generate Pattern'}
          </button>
        </div>
      </div>

      <style>{`@keyframes pbn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
