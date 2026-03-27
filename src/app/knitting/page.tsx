'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useKnittingPattern } from '@/context/KnittingPatternContext'
import { analyzeImageWithVibrant } from '@/modules/image-processing/vibrant'
import CropTool  from '@/components/upload/CropTool'
import BgRemoval from '@/components/upload/BgRemoval'
import { logEvent } from '@/lib/log'

const MAX_EDGE_PX = 1600

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale  = Math.min(1, MAX_EDGE_PX / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = url
  })
}

export default function KnittingUploadPage() {
  const router = useRouter()
  const { state, dispatch } = useKnittingPattern()
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [cropUrl,      setCropUrl]      = useState<string | null>(null)
  const [bgRemovalUrl, setBgRemovalUrl] = useState<string | null>(null)

  useEffect(() => { logEvent('VISIT', 'knitting') }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    logEvent('UPLOAD_STARTED')
    setError(null)
    setLoading(true)
    try {
      const dataUrl = await compressImage(file)
      dispatch({ type: 'SET_IMAGE', payload: dataUrl })
      try {
        const analysis = await analyzeImageWithVibrant(dataUrl)
        dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: Math.min(analysis.recommendedColors, 12) } })
      } catch { /* best-effort */ }
      setCropUrl(dataUrl)
    } catch {
      setError("Couldn't read that photo. Try a different one.")
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  if (cropUrl) {
    return (
      <main style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        <CropTool
          imageUrl={cropUrl}
          onConfirm={(url) => { setCropUrl(null); setBgRemovalUrl(url) }}
          onSkip={() => { const u = cropUrl; setCropUrl(null); setBgRemovalUrl(u) }}
        />
      </main>
    )
  }

  if (bgRemovalUrl) {
    return (
      <main style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        <BgRemoval
          imageUrl={bgRemovalUrl}
          onAccept={(url) => { setBgRemovalUrl(null); dispatch({ type: 'SET_IMAGE', payload: url }) }}
          onSkip={() => { const u = bgRemovalUrl; setBgRemovalUrl(null); dispatch({ type: 'SET_IMAGE', payload: u }) }}
          onCancel={() => { const u = bgRemovalUrl; setBgRemovalUrl(null); setCropUrl(u) }}
        />
      </main>
    )
  }

  const hasPhoto = !!state.rawImage

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>
          ← Back
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Knitting Graph</p>
        <div style={{ width: 48 }} />
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 120px' }}>

        <div style={{ width: '100%', maxWidth: 400, marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            {hasPhoto ? 'Photo ready' : 'Upload your photo'}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#3D2C1E', lineHeight: 1.65 }}>
            {hasPhoto
              ? 'Set your stitch count and gauge on the next screen.'
              : 'Upload any photo to turn into a knitting colorwork graph.'}
          </p>
        </div>

        <label
          htmlFor="knit-upload"
          style={{
            width: '100%', maxWidth: 400,
            height: hasPhoto ? 'auto' : 160,
            borderRadius: 20,
            border: hasPhoto ? 'none' : '2px dashed #E4D9C8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading ? 'wait' : 'pointer',
            background: hasPhoto ? 'transparent' : 'white',
            boxShadow: hasPhoto ? 'none' : '0 1px 6px rgba(44,34,24,0.05)',
          }}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'knit-spin 0.8s linear infinite' }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>Reading photo…</p>
            </div>
          )}
          {hasPhoto && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, padding: '12px 16px', boxShadow: '0 2px 12px rgba(44,34,24,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.rawImage!} alt="Your photo" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 4 }}>✅ Photo loaded</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0' }}>Tap to swap photo</p>
              </div>
            </div>
          )}
          {!hasPhoto && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F2EAD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#2C2218' }}>Tap to choose a photo</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>JPG, PNG, HEIC · Camera roll or files</p>
            </div>
          )}
        </label>

        <input id="knit-upload" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={handleFileChange} disabled={loading}
        />

        {error && (
          <div style={{ marginTop: 12, width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '10px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

        {/* Info card */}
        {!hasPhoto && !loading && (
          <div style={{ marginTop: 20, width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Knitting graph differences
            </p>
            {[
              ['📐', 'Correct stitch proportions', 'Graph cells reflect your actual stitch-to-row gauge'],
              ['🧶', 'Fair Isle or Intarsia', 'Choose your technique — each renders cells differently'],
              ['📏', 'Stitch count sizing', 'Set exact stitches × rows — no blanket presets'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #F2EAD8' }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2C2218' }}>{title}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to bottom, transparent, #FAF6EF 35%)', padding: '20px 20px max(24px, env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <button
            onClick={() => router.push('/knitting/settings')}
            disabled={!hasPhoto || loading}
            style={{ width: '100%', padding: '16px', background: hasPhoto ? '#C4614A' : '#E4D9C8', color: hasPhoto ? 'white' : '#B8AAA0', border: 'none', borderRadius: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: hasPhoto ? 'pointer' : 'not-allowed', boxShadow: hasPhoto ? '0 4px 20px rgba(196,97,74,0.28)' : 'none' }}
          >
            Set Stitch Count →
          </button>
        </div>
      </div>

      <style>{`@keyframes knit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
