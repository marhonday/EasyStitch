'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { PatternData } from '@/types/pattern'

export interface CrossStitchSettings {
  width:     number
  height:    number
  maxColors: number
  imageType: 'photo' | 'graphic'
  aidaCount: 14 | 18 | 28
}

interface CrossStitchState {
  rawImage:     string | null
  settings:     CrossStitchSettings
  patternData:  PatternData | null
  isGenerating: boolean
}

type Action =
  | { type: 'SET_IMAGE';       payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<CrossStitchSettings> }
  | { type: 'SET_PATTERN';     payload: PatternData }
  | { type: 'SET_GENERATING';  payload: boolean }
  | { type: 'RESET' }

const DEFAULT_SETTINGS: CrossStitchSettings = {
  width:     80,
  height:    100,
  maxColors: 12,
  imageType: 'photo',
  aidaCount: 14,
}

const initialState: CrossStitchState = {
  rawImage:     null,
  settings:     DEFAULT_SETTINGS,
  patternData:  null,
  isGenerating: false,
}

function reducer(state: CrossStitchState, action: Action): CrossStitchState {
  switch (action.type) {
    case 'SET_IMAGE':       return { ...state, rawImage: action.payload, patternData: null }
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN':     return { ...state, patternData: action.payload, isGenerating: false }
    case 'SET_GENERATING':  return { ...state, isGenerating: action.payload }
    case 'RESET':           return initialState
    default:                return state
  }
}

interface ContextValue { state: CrossStitchState; dispatch: React.Dispatch<Action> }
const CrossStitchContext = createContext<ContextValue | null>(null)

export function CrossStitchPatternProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <CrossStitchContext.Provider value={{ state, dispatch }}>{children}</CrossStitchContext.Provider>
}

export function useCrossStitch() {
  const ctx = useContext(CrossStitchContext)
  if (!ctx) throw new Error('useCrossStitch must be used inside CrossStitchPatternProvider')
  return ctx
}
