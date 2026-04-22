'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { PatternData } from '@/types/pattern'

// ─── Cross Stitch Settings ────────────────────────────────────────────────────

export interface CrossStitchSettings {
  width:     number
  height:    number
  maxColors: number
  imageType: 'photo' | 'graphic'
  aidaCount: 14 | 18 | 28
}

const DEFAULT_CROSS_STITCH_SETTINGS: CrossStitchSettings = {
  width:     80,
  height:    100,
  maxColors: 12,
  imageType: 'photo',
  aidaCount: 14,
}

// ─── State & Actions ─────────────────────────────────────────────────────────

interface CrossStitchState {
  rawImage:    string | null
  settings:    CrossStitchSettings
  patternData: PatternData | null
  isGenerating: boolean
}

type Action =
  | { type: 'SET_IMAGE';       payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<CrossStitchSettings> }
  | { type: 'SET_PATTERN';     payload: PatternData }
  | { type: 'SET_GENERATING';  payload: boolean }
  | { type: 'RESET' }

const initialState: CrossStitchState = {
  rawImage:     null,
  settings:     DEFAULT_CROSS_STITCH_SETTINGS,
  patternData:  null,
  isGenerating: false,
}

const SESSION_KEY = 'easystitch_crossstitch_session'

function saveToSession(state: CrossStitchState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage can throw if quota is exceeded — fail silently
  }
}

function loadFromSession(): Partial<CrossStitchState> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<CrossStitchState>
  } catch {
    return null
  }
}

function buildInitialState(): CrossStitchState {
  const saved = loadFromSession()
  if (!saved) return initialState
  return {
    ...initialState,
    rawImage:    saved.rawImage    ?? null,
    settings:    saved.settings    ?? DEFAULT_CROSS_STITCH_SETTINGS,
    patternData: saved.patternData ?? null,
  }
}

function crossStitchReducer(state: CrossStitchState, action: Action): CrossStitchState {
  switch (action.type) {
    case 'SET_IMAGE':
      return {
        ...state,
        rawImage:    action.payload,
        patternData: null,
      }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN':
      return { ...state, patternData: action.payload, isGenerating: false }
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload }
    case 'RESET':
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
      return initialState
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface CrossStitchContextValue {
  state:    CrossStitchState
  dispatch: React.Dispatch<Action>
}

const CrossStitchContext = createContext<CrossStitchContextValue | null>(null)

export function CrossStitchPatternProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(crossStitchReducer, undefined, buildInitialState)

  // Debounce sessionStorage writes
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveToSession(state), 400)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [state])

  return (
    <CrossStitchContext.Provider value={{ state, dispatch }}>
      {children}
    </CrossStitchContext.Provider>
  )
}

export function useCrossStitch() {
  const ctx = useContext(CrossStitchContext)
  if (!ctx) throw new Error('useCrossStitch must be used within CrossStitchPatternProvider')
  return ctx
}
