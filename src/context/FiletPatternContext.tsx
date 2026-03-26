'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { PatternData } from '@/types/pattern'
import { FiletMode } from '@/lib/filetPreprocess'

export type { FiletMode }

export interface FiletSettings {
  width:     number
  height:    number
  threshold: number
  invert:    boolean
  mode:      FiletMode
}

interface FiletState {
  rawImage:     string | null
  settings:     FiletSettings
  patternData:  PatternData | null
  isGenerating: boolean
}

type Action =
  | { type: 'SET_IMAGE';       payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<FiletSettings> }
  | { type: 'SET_PATTERN';     payload: PatternData }
  | { type: 'SET_GENERATING';  payload: boolean }
  | { type: 'RESET' }

const DEFAULT_SETTINGS: FiletSettings = {
  width:     40,
  height:    60,
  threshold: 145,
  invert:    false,
  mode:      'clean',
}

const initialState: FiletState = {
  rawImage:     null,
  settings:     DEFAULT_SETTINGS,
  patternData:  null,
  isGenerating: false,
}

function reducer(state: FiletState, action: Action): FiletState {
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
  state:    FiletState
  dispatch: React.Dispatch<Action>
}

const FiletPatternContext = createContext<ContextValue | null>(null)

export function FiletPatternProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <FiletPatternContext.Provider value={{ state, dispatch }}>
      {children}
    </FiletPatternContext.Provider>
  )
}

export function useFiletPattern() {
  const ctx = useContext(FiletPatternContext)
  if (!ctx) throw new Error('useFiletPattern must be used inside FiletPatternProvider')
  return ctx
}
