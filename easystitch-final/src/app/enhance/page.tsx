'use client'

/**
 * app/enhance/page.tsx
 *
 * Step 2: Optional AI / photo cleanup preprocessing.
 *
 * States:
 *   idle         — show original photo, offer Enhance + Skip
 *   processing   — running the pipeline (spinner)
 *   done         — show before/after comparison, applied steps list
 *   failed       — pipeline returned success:false, show original + friendly error
 *
 * The "Continue" CTA is always available regardless of enhancement state —
 * this step is explicitly optional. If enhancement failed, continuing just
 * uses the original image.
 *
 * Before/after layout: side-by-side on the same screen after processing,
 * so the user can immediately see the improvement (or decide it's not needed).
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Header         from '@/components/layout/Header'
import StepIndicator  from '@/components/ui/StepIndicator'
import BottomCTA      from '@/components/layout/BottomCTA'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { usePattern } from '@/context/PatternContext'
import { runEnhancePipeline, PipelineResult } from '@/modules/image-processing/enhancePipeline'

type EnhanceStatus = 'idle' | 'processing' | 'done' | 'failed'

// Friendly labels for the applied step names
const STEP_LABELS: Record<string, string> = {
  crop:       '✂️ Auto-centred & cropped',
  contrast:   '☀️ Contrast improved',
  saturation: '🎨 Colours boosted',
  posterize:  '🖼️ Gradients simplified',
  background: '🌅 Background lightened',
  sharpen:    '🔍 Edges sharpened',
}

export default function EnhancePage() {
  const router  = useRouter()
  const { state, dispatch } = usePattern()

  const [status,  setStatus]  = useState<EnhanceStatus>('idle')
  const [result,  setResult]  = useState<PipelineResult | null>(null)

  const originalImage  = state.rawImage
  const displayImage   = state.enhancedImage ?? originalImage

  async function handleEnhance() {
    if (!originalImage) return

    setStatus('processing')

    const pipelineResult = await runEnhancePipeline(originalImage)

    if (pipelineResult.success && pipelineResult.appliedSteps.length > 0) {
      dispatch({ type: 'SET_ENHANCED_IMAGE', payload: pipelineResult.dataUrl })
      setResult(pipelineResult)
      setStatus('done')
    } else if (!pipelineResult.success) {
      // Keep rawImage in context — user continues with original
      setResult(pipelineResult)
      setStatus('failed')
    } else {
      // Pipeline ran but no steps applied — image was already great
      setResult(pipelineResult)
      setStatus('done')
    }
  }

  function handleRevert() {
    dispatch({ type: 'CLEAR_ENHANCED_IMAGE' })
    setResult(null)
    setStatus('idle')
  }

  // ── Processing ─────────────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <main className="min-h-screen flex flex-col bg-cream-50">
        <Header />
        <StepIndicator />
        <LoadingSpinner message="Cleaning up your photo…" />
      </main>
    )
  }

  // ── Idle / done / failed — same layout, different content ─────────────────
  return (
    <main className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      <StepIndicator />

      <section className="flex-1 flex flex-col items-center px-6 pt-4 pb-40 gap-5">

        {/* Title */}
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl text-ink mb-2">
            {status === 'done'   && result && result.appliedSteps.length > 0 ? '✨ Cleaned up!' :
             status === 'failed' ? 'Looks good as-is' :
             'Auto-enhance photo?'}
          </h1>
          <p className="font-body text-sm text-ink/50">
            {status === 'done' && result && result.appliedSteps.length > 0
              ? 'Sharpened for a crisper pattern. Compare and continue when happy.'
              : status === 'done'
              ? 'Already looking great — no changes needed.'
              : status === 'failed'
              ? 'Enhancement skipped — original will work great.'
              : 'Boosts contrast and sharpness for a better pattern. Optional but recommended for pet photos.'}
          </p>
        </div>

        {/* Photo display */}
        {status === 'done' && result && result.appliedSteps.length > 0 ? (
          // Before / after comparison
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-body text-xs text-ink/40 text-center mb-2">Before</p>
                <div className="aspect-square rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={originalImage!} alt="Original" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <p className="font-body text-xs text-rose-DEFAULT text-center mb-2 font-medium">After ✓</p>
                <div className="aspect-square rounded-2xl overflow-hidden ring-2 ring-rose-DEFAULT">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.enhancedImage!} alt="Enhanced" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Applied steps */}
            <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-body text-xs text-ink/40 uppercase tracking-wide mb-3">What changed</p>
              <div className="flex flex-col gap-2">
                {result.appliedSteps.map((step: string) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="text-sm">{STEP_LABELS[step] ?? step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revert option */}
            <button
              onClick={handleRevert}
              className="w-full mt-3 text-center text-xs font-body text-ink/30 hover:text-ink/50 transition-colors"
            >
              Undo — use original instead
            </button>
          </div>
        ) : (
          // Single photo (idle or failed or no changes)
          <div className="w-full max-w-sm">
            <div className="aspect-square rounded-3xl overflow-hidden shadow-card">
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImage} alt="Your photo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-cream-200 flex items-center justify-center text-4xl">🖼</div>
              )}
            </div>

            {/* Failure message */}
            {status === 'failed' && result?.error && (
              <div className="mt-3 bg-rose-DEFAULT/8 rounded-2xl px-4 py-3">
                <p className="font-body text-xs text-rose-deep">
                  Technical detail: {result.error}
                </p>
              </div>
            )}

            {/* Tips for better results */}
            {status === 'idle' && (
              <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-body text-xs text-ink/40 uppercase tracking-wide mb-2">Tips for best results</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    '📸 Subject in focus, not blurry',
                    '🌞 Good lighting, not too dark',
                    '🎨 Simple or plain background',
                  ].map(tip => (
                    <p key={tip} className="font-body text-xs text-ink/60">{tip}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </section>

      <BottomCTA
        primaryLabel={
          status === 'done' || status === 'failed' ? 'Continue to Settings →' : 'Skip →'
        }
        onPrimary={() => router.push('/settings')}
        secondaryLabel={status === 'idle' ? '✨ Auto-Enhance Photo' : undefined}
        onSecondary={status === 'idle' ? handleEnhance : undefined}
      />
    </main>
  )
}
