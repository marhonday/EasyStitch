'use client'

import { useState, useCallback, useRef } from 'react'
import { usePattern } from '@/context/PatternContext'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'
import { runEnhancePipeline } from '@/modules/image-processing/enhancePipeline'

interface UsePatternGenerationResult {
  generate:     () => Promise<boolean>
  isGenerating: boolean
  error:        string | null
}

export function usePatternGeneration(): UsePatternGenerationResult {
  const { state, dispatch } = usePattern()
  const [error, setError]   = useState<string | null>(null)
  const inFlight            = useRef(false)

  const generate = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false

    const rawImage = state.rawImage
    if (!rawImage) {
      setError('No image available. Please upload a photo first.')
      return false
    }

    inFlight.current = true
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })

    try {
      // Enhance at generation time — not at upload/crop time
      // This ensures the cropped image is what gets enhanced, not the original
      let imageToUse = rawImage
      try {
        const enhanced = await runEnhancePipeline(rawImage)
        if (enhanced.success && enhanced.appliedSteps.length > 0) {
          imageToUse = enhanced.dataUrl
          dispatch({ type: 'SET_ENHANCED_IMAGE', payload: enhanced.dataUrl })
        }
      } catch { /* non-critical */ }

      console.log('USING IMAGE length:', imageToUse?.length, 'raw length:', rawImage?.length)
      const patternData = await generatePattern(imageToUse, state.settings)
      dispatch({ type: 'SET_PATTERN_DATA', payload: patternData })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pattern generation failed'
      setError(message)
      dispatch({ type: 'SET_GENERATING', payload: false })
      return false
    } finally {
      inFlight.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rawImage, state.settings.stitchStyle, state.settings.gridSize.label, state.settings.maxColors, dispatch])

  return {
    generate,
    isGenerating: state.isGenerating,
    error,
  }
}
