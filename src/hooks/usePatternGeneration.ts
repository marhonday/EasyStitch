'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePattern } from '@/context/PatternContext'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'

interface UsePatternGenerationResult {
  generate:     () => Promise<boolean>
  isGenerating: boolean
  error:        string | null
}

export function usePatternGeneration(): UsePatternGenerationResult {
  const { state, dispatch } = usePattern()
  const [error, setError]   = useState<string | null>(null)
  const inFlight            = useRef(false)

  // Use refs so callbacks always get latest values without stale closures
  const rawImageRef  = useRef(state.rawImage)
  const settingsRef  = useRef(state.settings)

  useEffect(() => { rawImageRef.current  = state.rawImage  }, [state.rawImage])
  useEffect(() => { settingsRef.current  = state.settings  }, [state.settings])

  const generate = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false

    const rawImage = rawImageRef.current
    const settings = settingsRef.current

    console.log('=== GENERATE using rawImage length:', rawImage?.length)

    if (!rawImage) {
      setError('No image available. Please upload a photo first.')
      return false
    }

    inFlight.current = true
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })

    try {
      console.log('USING IMAGE length:', rawImage?.length)
      const patternData = await generatePattern(rawImage, settings)
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
  }, [dispatch])

  return {
    generate,
    isGenerating: state.isGenerating,
    error,
  }
}
