'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { usePbnPattern } from '@/context/PbnPatternContext'
import { logEvent } from '@/lib/log'

const MAX_EDGE_PX = 1600

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h))
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

export default function PbnUploadPage() {
  const router = useRouter()
  const { state, dispatch } = usePbnPattern()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => { logEvent('VISIT', 'paint-by-number') }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    logEvent('UPLOAD_STARTED', 'paint-by-number')
    setError(null)
    setLoading(true)
    try {
      const dataUrl = await compressImage(file)
      dispatch({ type: 'SET_IMAGE', payload: dataUrl })
    } catch {
      setError("Couldn't read that photo. Try a different one.")
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const hasPhoto = !!state.rawImage

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Paint by Number</p>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎨</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Turn any photo into a paint by number
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.7, maxWidth: 340, margin: '0 auto' }}>
            Upload a photo and we&apos;ll create a numbered pattern you can print and paint. Works great with portraits, landscapes, and pets.
          </p>
        </div>

        {/* Upload area */}
        <label style={{
          width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: hasPhoto ? '2px solid #C4614A' : '2px dashed #C8BFB0',
          borderRadius: 20, padding: hasPhoto ? 0 : '40px 20px',
          background: hasPhoto ? 'transparent' : 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          overflow: 'hidden', minHeight: hasPhoto ? 220 : undefined,
          boxShadow: '0 2px 12px rgba(44,34,24,0.06)',
          transition: 'border-color 0.2s',
        }}>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={loading} />
          {hasPhoto ? (
            <img
              src={state.rawImage!}
              alt="Uploaded photo"
              style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
            />
          ) : loading ? (
            <>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #EDE4D8', borderTopColor: '#C4614A', animation: 'pbn-spin 0.8s linear infinite', marginBottom: 12 }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9A8878' }}>Loading photo…</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#2C2218', marginBottom: 4 }}>Tap to choose a photo</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>JPG, PNG, HEIC — any size</p>
            </>
          )}
        </label>

        {hasPhoto && (
          <label style={{ marginTop: 10, cursor: 'pointer' }}>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={loading} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A', textDecoration: 'underline' }}>
              Choose a different photo
            </span>
          </label>
        )}

        {error && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A', marginTop: 12, textAlign: 'center' }}>{error}</p>
        )}

        {/* Tips */}
        <div style={{ width: '100%', background: 'white', borderRadius: 16, padding: '16px 18px', marginTop: 24, boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Photo tips
          </p>
          {[
            ['High contrast', 'Bold shapes and clear subject edges give the cleanest regions'],
            ['Good lighting', 'Avoid dark, shadowy photos — flat even light works best'],
            ['Simple background', 'Solid or plain backgrounds make the subject pop more'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#C4614A', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218', lineHeight: 1.5 }}>
                <strong>{title}</strong> — {desc}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/pbn/settings')}
          disabled={!hasPhoto || loading}
          style={{
            marginTop: 28, width: '100%', padding: '15px',
            background: hasPhoto && !loading ? '#C4614A' : '#E4D9C8',
            color: hasPhoto && !loading ? 'white' : '#B8AAA0',
            border: 'none', borderRadius: 14,
            fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
            cursor: hasPhoto && !loading ? 'pointer' : 'not-allowed',
            boxShadow: hasPhoto && !loading ? '0 4px 20px rgba(196,97,74,0.28)' : 'none',
          }}
        >
          Next: Set up pattern →
        </button>

      </div>

      <style>{`@keyframes pbn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
