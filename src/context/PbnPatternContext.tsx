'use client'

import { createContext, useContext, useReducer } from 'react'
import { PatternData } from '@/types/pattern'

export interface PbnSettings {
  width:      number
  height:     number
  colorCount: number
  imageType:  'photo' | 'graphic'
}

interface PbnState {
  rawImage:    string | null
  patternData: PatternData | null
  settings:    PbnSettings
}

type PbnAction =
  | { type: 'SET_IMAGE';    payload: string }
  | { type: 'SET_PATTERN';  payload: PatternData }
  | { type: 'SET_SETTINGS'; payload: Partial<PbnSettings> }
  | { type: 'RESET' }

const defaultSettings: PbnSettings = {
  width:      80,
  height:     60,
  colorCount: 8,
  imageType:  'photo',
}

const initialState: PbnState = {
  rawImage:    null,
  patternData: null,
  settings:    defaultSettings,
}

function reducer(state: PbnState, action: PbnAction): PbnState {
  switch (action.type) {
    case 'SET_IMAGE':    return { ...state, rawImage: action.payload, patternData: null }
    case 'SET_PATTERN':  return { ...state, patternData: action.payload }
    case 'SET_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'RESET':        return initialState
    default:             return state
  }
}

const PbnPatternContext = createContext<{
  state: PbnState
  dispatch: React.Dispatch<PbnAction>
} | null>(null)

export function PbnPatternProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <PbnPatternContext.Provider value={{ state, dispatch }}>
      {children}
    </PbnPatternContext.Provider>
  )
}

export function usePbnPattern() {
  const ctx = useContext(PbnPatternContext)
  if (!ctx) throw new Error('usePbnPattern must be used within PbnPatternProvider')
  return ctx
}
