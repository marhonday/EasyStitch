'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { PatternContextState, PatternSettings, PatternData, PersonalizationSettings } from '@/types/pattern'
import { DEFAULT_SETTINGS } from '@/lib/constants'

// ─── State & Actions ─────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_RAW_IMAGE';        payload: string }
  | { type: 'SET_ENHANCED_IMAGE';   payload: string }
  | { type: 'CLEAR_ENHANCED_IMAGE' }
  | { type: 'SET_DETECTED_COLORS';  payload: number }
  | { type: 'SET_DOMINANT_PALETTE'; payload: { hex: string; population: number }[] }
  | { type: 'SET_RECOMMENDED_COLORS'; payload: number }
  | { type: 'UPDATE_PERSONALIZATION'; payload: Partial<PersonalizationSettings> }
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
  dominantPalette: null,
  recommendedColors: null,
  personalization: {
    enabled: false,
    titleText: '',
    dateText: '',
    fontStyle: 'pressStart2P',
    placement: 'below',
    colorMode: 'palette',
    paletteColorIndex: 0,
    customColor: '#2c2218',
  },
}

const SESSION_KEY = 'easystitch_session'

function saveToSession(state: PatternContextState) {
  try {
    // Only persist the data-heavy parts — rawImage can be large, store it too
    // so navigating to /project and back doesn't lose everything.
    const toSave = {
      rawImage:      state.rawImage,
      enhancedImage: state.enhancedImage,
      settings:      state.settings,
      patternData:   state.patternData,
      personalization: state.personalization,
      detectedColors: state.detectedColors,
      recommendedColors: state.recommendedColors,
      dominantPalette: state.dominantPalette,
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave))
  } catch {
    // sessionStorage can throw if quota is exceeded (large images) — fail silently
  }
}

function loadFromSession(): Partial<PatternContextState> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<PatternContextState>
  } catch {
    return null
  }
}

function buildInitialState(): PatternContextState {
  const saved = loadFromSession()
  if (!saved) return initialState
  return {
    ...initialState,
    rawImage:       saved.rawImage       ?? null,
    enhancedImage:  saved.enhancedImage  ?? null,
    settings:       saved.settings       ?? DEFAULT_SETTINGS,
    patternData:    saved.patternData    ?? null,
    personalization: saved.personalization ?? initialState.personalization,
    detectedColors: saved.detectedColors ?? null,
    recommendedColors: saved.recommendedColors ?? null,
    dominantPalette: saved.dominantPalette ?? null,
  }
}

function patternReducer(state: PatternContextState, action: Action): PatternContextState {
  switch (action.type) {
    case 'SET_RAW_IMAGE':
      return {
        ...state,
        rawImage: action.payload,
        enhancedImage: null,
        patternData: null,
        detectedColors: null,
        dominantPalette: null,
        recommendedColors: null,
        personalization: initialState.personalization,
      }
    case 'SET_ENHANCED_IMAGE':
      return { ...state, enhancedImage: action.payload }
    case 'CLEAR_ENHANCED_IMAGE':
      return { ...state, enhancedImage: null }
    case 'SET_DETECTED_COLORS':
      return { ...state, detectedColors: action.payload }
    case 'SET_DOMINANT_PALETTE':
      return { ...state, dominantPalette: action.payload }
    case 'SET_RECOMMENDED_COLORS':
      return { ...state, recommendedColors: action.payload }
    case 'UPDATE_PERSONALIZATION':
      return { ...state, personalization: { ...state.personalization, ...action.payload } }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_PATTERN_DATA':
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

interface PatternContextValue {
  state:    PatternContextState
  dispatch: React.Dispatch<Action>
}

const PatternContext = createContext<PatternContextValue | null>(null)

export function PatternProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(patternReducer, undefined, buildInitialState)

  // Debounce sessionStorage writes — pattern data can be large
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveToSession(state), 400)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [state])

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
