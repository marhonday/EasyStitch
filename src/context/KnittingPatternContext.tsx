'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { PatternData } from '@/types/pattern'
import { KNITTING_CELL_RATIO } from '@/modules/pattern-engine/strategies/knitting.strategy'

export type KnittingStyle = 'knittingStranded' | 'knittingIntarsia'

export interface KnittingSettings {
  width:        number
  height:       number
  maxColors:    number
  style:        KnittingStyle
  imageType:    'photo' | 'graphic' | 'pixel'
}

interface KnittingState {
  rawImage:     string | null
  settings:     KnittingSettings
  patternData:  PatternData | null
  isGenerating: boolean
}

type Action =
  | { type: 'SET_IMAGE';       payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<KnittingSettings> }
  | { type: 'SET_PATTERN';     payload: PatternData }
  | { type: 'SET_GENERATING';  payload: boolean }
  | { type: 'RESET' }

const DEFAULT_SETTINGS: KnittingSettings = {
  width:     80,
  height:    100,
  maxColors: 7,
  style:     'knittingStranded',
  imageType: 'photo',
}

const initialState: KnittingState = {
  rawImage:     null,
  settings:     DEFAULT_SETTINGS,
  patternData:  null,
  isGenerating: false,
}

function reducer(state: KnittingState, action: Action): KnittingState {
  switch (action.type) {
    case 'SET_IMAGE':       return { ...state, rawImage: action.payload, patternData: null }
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN':     return { ...state, patternData: action.payload, isGenerating: false }
    case 'SET_GENERATING':  return { ...state, isGenerating: action.payload }
    case 'RESET':           return initialState
    default:                return state
  }
}

interface ContextValue {
  state:    KnittingState
  dispatch: React.Dispatch<Action>
}

const KnittingPatternContext = createContext<ContextValue | null>(null)

export function KnittingPatternProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <KnittingPatternContext.Provider value={{ state, dispatch }}>
      {children}
    </KnittingPatternContext.Provider>
  )
}

export function useKnittingPattern() {
  const ctx = useContext(KnittingPatternContext)
  if (!ctx) throw new Error('useKnittingPattern must be used inside KnittingPatternProvider')
  return ctx
}

/** Cell width multiplier for the current knitting style */
export function getCellWidthMultiplier(style: KnittingStyle): number {
  return KNITTING_CELL_RATIO[style] ?? 1
}
