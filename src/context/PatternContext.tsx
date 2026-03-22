'use client'

import React, { createContext, useContext, useReducer } from 'react'
import { PatternContextState, PatternSettings, PatternData } from '@/types/pattern'
import { DEFAULT_SETTINGS } from '@/lib/constants'

// ─── State & Actions ─────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_RAW_IMAGE';        payload: string }
  | { type: 'SET_ENHANCED_IMAGE';   payload: string }
  | { type: 'CLEAR_ENHANCED_IMAGE' }
  | { type: 'SET_DETECTED_COLORS';  payload: number }
  | { type: 'UPDATE_SETTINGS';      payload: Partial<PatternSettings> }
  | { type: 'SET_PATTERN_DATA';     payload: PatternData }
  | { type: 'SET_GENERATING';       payload: boolean }
  | { type: 'RESET' }

const initialState: PatternContextState = {
  rawImage:       null,
  enhancedImage:  null,
  settings:       DEFAULT_SETTINGS,
  patternData:    null,
  isGenerating:   false,
  detectedColors: null,
}

function patternReducer(state: PatternContextState, action: Action): PatternContextState {
  switch (action.type) {
    case 'SET_RAW_IMAGE':
      return { ...state, rawImage: action.payload, enhancedImage: null, patternData: null, detectedColors: null }
    case 'SET_ENHANCED_IMAGE':
      return { ...state, enhancedImage: action.payload }
    case 'CLEAR_ENHANCED_IMAGE':
      return { ...state, enhancedImage: null }
    case 'SET_DETECTED_COLORS':
      return { ...state, detectedColors: action.payload }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN_DATA':
      return { ...state, patternData: action.payload, isGenerating: false }
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface PatternContextValue {
  state:    PatternContextState
  dispatch: React.Dispatch<Action>
}

const PatternContext = createContext<PatternContextValue | null>(null)

export function PatternProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(patternReducer, initialState)
  return (
    <PatternContext.Provider value={{ state, dispatch }}>
      {children}
    </PatternContext.Provider>
  )
}

export function usePattern() {
  const ctx = useContext(PatternContext)
  if (!ctx) throw new Error('usePattern must be used within PatternProvider')
  return ctx
}
