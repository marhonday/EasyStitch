'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { PatternData, StitchStyle } from '@/types/pattern'

// ─── State ────────────────────────────────────────────────────────────────────

export interface AdvancedSettings {
  width:      number
  height:     number
  maxColors:  number
  stitchStyle: StitchStyle
  imageType:  'photo' | 'graphic' | 'pixel'
}

interface AdvancedState {
  rawImage:    string | null
  settings:    AdvancedSettings
  patternData: PatternData | null
  isGenerating: boolean
}

type Action =
  | { type: 'SET_IMAGE';        payload: string }
  | { type: 'UPDATE_SETTINGS';  payload: Partial<AdvancedSettings> }
  | { type: 'SET_PATTERN';      payload: PatternData }
  | { type: 'SET_GENERATING';   payload: boolean }
  | { type: 'RESET' }

const DEFAULT_SETTINGS: AdvancedSettings = {
  width:       80,
  height:      80,
  maxColors:   8,
  stitchStyle: 'singleCrochet',
  imageType:   'photo',
}

const initialState: AdvancedState = {
  rawImage:     null,
  settings:     DEFAULT_SETTINGS,
  patternData:  null,
  isGenerating: false,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AdvancedState, action: Action): AdvancedState {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...state, rawImage: action.payload, patternData: null }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN':
      return { ...state, patternData: action.payload, isGenerating: false }
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ContextValue {
  state:    AdvancedState
  dispatch: React.Dispatch<Action>
}

const AdvancedPatternContext = createContext<ContextValue | null>(null)

export function AdvancedPatternProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AdvancedPatternContext.Provider value={{ state, dispatch }}>
      {children}
    </AdvancedPatternContext.Provider>
  )
}

export function useAdvancedPattern() {
  const ctx = useContext(AdvancedPatternContext)
  if (!ctx) throw new Error('useAdvancedPattern must be used inside AdvancedPatternProvider')
  return ctx
}
