'use client'

/**
 * Step 1: Upload
 *
 * Enhancement now runs automatically as soon as a photo is selected —
 * no separate enhance step. User sees a subtle "cleaning up…" indicator
 * while it processes, then goes straight to Settings.
 *
 * This removes one full wizard step and makes enhancement feel like
 * a natural part of uploading rather than a confusing optional detour.
 */

import { useRouter } from 'next/navigation'
import { useState }  from 'react'
import Header        from '@/components/layout/Header'
import StepIndicator from '@/components/ui/StepIndicator'
import BottomCTA     from '@/components/layout/BottomCTA'
import { usePattern } from '@/context/PatternContext'
import CropTool from '@/components/upload/CropTool'

const MAX_RAW_BYTES = 8 * 1024 * 1024
const MAX_EDGE_PX   = 1600

/**
 * Count genuinely distinct colors in an image.
 * Samples a small canvas (64x64) and clusters pixels with ΔE threshold.
 * Returns how many distinct color groups exist, capped at maxColors.
 */

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

type LoadState = 'idle' | 'compressing' | 'enhancing' | 'ready' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const { state, dispatch } = usePattern()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error,     setError]     = useState<string | null>(null)
  const [cropUrl,   setCropUrl]   = useState<string | null>(null)

  const hasPhoto = !!state.rawImage

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > 50 * 1024 * 1024) {
      setError('That file is too large. Try a photo under 50 MB.')
      e.target.value = ''
      return
    }

    // Step 1: compress/normalise
    setLoadState('compressing')
    let dataUrl: string
    try {
      dataUrl = await compressImage(file)
    } catch {
      setError('Couldn\'t read that photo. Try a different one.')
      setLoadState('error')
      e.target.value = ''
      return
    }

    dispatch({ type: 'SET_RAW_IMAGE', payload: dataUrl })
    setLoadState('ready')
    setCropUrl(dataUrl)
  }

  async function handleCropConfirm(croppedUrl: string) {
    setCropUrl(null)
    // Just store the cropped image — enhance/detect runs at generation time
    dispatch({ type: 'SET_RAW_IMAGE', payload: croppedUrl })
    setLoadState('ready')
  }

  const statusMessage = {
    compressing: 'Reading photo…',
    enhancing:   'Cleaning up photo…',
    ready:       null,
    idle:        null,
    error:       null,
  }[loadState]

  const isLoading = loadState === 'compressing' || loadState === 'enhancing'

  // Show crop tool fullscreen
  if (cropUrl) {
    return (
      <main style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        <CropTool
          imageUrl={cropUrl}
          onConfirm={handleCropConfirm}
          onSkip={() => {
            setCropUrl(null)
            handleCropConfirm(cropUrl)
          }}
        />
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header />
      <StepIndicator />

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px 160px' }}>

        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Choose your photo
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6 }}>
            Pets, portraits, flowers — anything with a clear subject works great.
          </p>
        </div>

        {/* Upload / preview area */}
        <label
          htmlFor="photo-upload"
          style={{
            width: '100%', maxWidth: 400, aspectRatio: '1',
            borderRadius: 24,
            border: hasPhoto ? 'none' : '2px dashed #E4D9C8',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: isLoading ? 'wait' : 'pointer',
            overflow: 'hidden',
            background: hasPhoto ? 'transparent' : 'white',
            boxShadow: hasPhoto ? '0 4px 24px rgba(44,34,24,0.10)' : 'none',
            position: 'relative',
          }}
        >
          {/* Photo */}
          {hasPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.enhancedImage ?? state.rawImage!}
              alt="Your photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(250,246,239,0.88)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid #E4D9C8',
                borderTopColor: '#C4614A',
                animation: 'upload-spin 0.8s linear infinite',
              }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
                {statusMessage}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!hasPhoto && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F2EAD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                📷
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#2C2218' }}>
                Tap to choose a photo
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                JPG, PNG or HEIC · Camera roll or files
              </p>
            </div>
          )}
        </label>

        <input
          id="photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {/* Status / error / swap */}
        <div style={{ marginTop: 14, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          {error && (
            <div style={{ background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '10px 16px', marginBottom: 10 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
            </div>
          )}

          {loadState === 'ready' && state.enhancedImage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>✨</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4A9050' }}>
                Photo cleaned up automatically
              </p>
            </div>
          )}

          {hasPhoto && !isLoading && (
            <label
              htmlFor="photo-upload"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#C8BFB0' }}
            >
              Choose a different photo
            </label>
          )}
        </div>

        {/* Tips — only when no photo selected */}
        {!hasPhoto && !isLoading && (
          <div style={{ marginTop: 20, width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Tips for best results
            </p>
            {[
              ['🐾', 'Clear subject', 'Pet or object against a plain-ish background'],
              ['☀️', 'Good lighting', 'Bright, not dark or backlit'],
              ['🎯', 'Centred subject', 'Subject fills most of the frame'],
            ].map(([emoji, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #F2EAD8' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{emoji}</span>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218' }}>{title}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      <BottomCTA
        primaryLabel="Set Up My Pattern →"
        onPrimary={() => router.push('/settings')}
        primaryDisabled={!hasPhoto || isLoading}
      />

      <style>{`
        @keyframes upload-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
