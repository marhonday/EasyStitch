'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { PatternData } from '@/types/pattern'

export interface DiamondPaintingSettings {
  drillType:  'round' | 'square'
  width:      number
  height:     number
  maxColors:  number
  imageType:  'photo' | 'graphic' | 'pixel'
}

interface DiamondPaintingState {
  rawImage:     string | null
  settings:     DiamondPaintingSettings
  patternData:  PatternData | null
  isGenerating: boolean
}

type Action =
  | { type: 'SET_IMAGE';       payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<DiamondPaintingSettings> }
  | { type: 'SET_PATTERN';     payload: PatternData }
  | { type: 'SET_GENERATING';  payload: boolean }
  | { type: 'RESET' }

const DEFAULT_SETTINGS: DiamondPaintingSettings = {
  drillType:  'round',
  width:      80,
  height:     100,
  maxColors:  20,
  imageType:  'photo',
}

const initialState: DiamondPaintingState = {
  rawImage:     null,
  settings:     DEFAULT_SETTINGS,
  patternData:  null,
  isGenerating: false,
}

function reducer(state: DiamondPaintingState, action: Action): DiamondPaintingState {
  switch (action.type) {
    case 'SET_IMAGE':       return { ...state, rawImage: action.payload, patternData: null }
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN':     return { ...state, patternData: action.payload, isGenerating: false }
    case 'SET_GENERATING':  return { ...state, isGenerating: action.payload }
    case 'RESET':           return initialState
    default:                return state
  }
}

interface ContextValue { state: DiamondPaintingState; dispatch: React.Dispatch<Action> }
const DiamondPaintingContext = createContext<ContextValue | null>(null)

export function DiamondPaintingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <DiamondPaintingContext.Provider value={{ state, dispatch }}>
      {children}
    </DiamondPaintingContext.Provider>
  )
}

export function useDiamondPainting() {
  const ctx = useContext(DiamondPaintingContext)
  if (!ctx) throw new Error('useDiamondPainting must be used inside DiamondPaintingProvider')
  return ctx
}
