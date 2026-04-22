/**
 * useProjectStorage.ts
 *
 * localStorage-backed hook for saving/loading crochet projects.
 * Each project stores: pattern data, project name, row progress, created date.
 *
 * Keys: easystitch_project_{id}
 * Index: easystitch_projects (array of ids + metadata for listing)
 */

'use client'
import { storageGet, storageSet, storageRemove, storageIsPersistent } from '@/lib/storage'

import { useState, useEffect, useCallback } from 'react'
import { PatternData } from '@/types/pattern'

export interface SavedProject {
  id:           string
  name:         string
  createdAt:    string
  updatedAt:    string
  pattern:      PatternData
  rowProgress:  boolean[]   // index = row number - 1, true = completed
  completedRows: number
  totalRows:    number
  rawImageThumb?: string    // small base64 thumbnail for listing
}

export interface ProjectMeta {
  id:           string
  name:         string
  createdAt:    string
  updatedAt:    string
  completedRows: number
  totalRows:    number
}

const INDEX_KEY    = 'easystitch_projects'
const projectKey   = (id: string) => `easystitch_project_${id}`

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadIndex(): ProjectMeta[] {
  try {
    const raw = storageGet(INDEX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveIndex(index: ProjectMeta[]) {
  try { storageSet(INDEX_KEY, JSON.stringify(index)) } catch {}
}

function loadProject(id: string): SavedProject | null {
  try {
    const raw = storageGet(projectKey(id))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveProject(project: SavedProject) {
  try {
    storageSet(projectKey(project.id), JSON.stringify(project))
    // Update index
    const index = loadIndex()
    const meta: ProjectMeta = {
      id:            project.id,
      name:          project.name,
      createdAt:     project.createdAt,
      updatedAt:     project.updatedAt,
      completedRows: project.completedRows,
      totalRows:     project.totalRows,
    }
    const idx = index.findIndex(p => p.id === project.id)
    if (idx >= 0) index[idx] = meta
    else          index.unshift(meta)
    saveIndex(index)
  } catch {}
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export function useProjectStorage() {
  const [projects, setProjects] = useState<ProjectMeta[]>([])

  useEffect(() => {
    setProjects(loadIndex())
  }, [])

  const createProject = useCallback((
    pattern:  PatternData,
    name:     string,
    thumb?:   string
  ): SavedProject => {
    const now = new Date().toISOString()
    const project: SavedProject = {
      id:            generateId(),
      name:          name || 'My Pattern',
      createdAt:     now,
      updatedAt:     now,
      pattern,
      rowProgress:   new Array(pattern.meta.height).fill(false),
      completedRows: 0,
      totalRows:     pattern.meta.height,
      rawImageThumb: thumb,
    }
    saveProject(project)
    setProjects(loadIndex())
    return project
  }, [])

  const updateProgress = useCallback((
    id:      string,
    rowIdx:  number,
    done:    boolean
  ) => {
    const project = loadProject(id)
    if (!project) return

    project.rowProgress[rowIdx] = done
    project.completedRows = project.rowProgress.filter(Boolean).length
    project.updatedAt = new Date().toISOString()
    saveProject(project)
    setProjects(loadIndex())
  }, [])

  const renameProject = useCallback((id: string, name: string) => {
    const project = loadProject(id)
    if (!project) return
    project.name = name
    project.updatedAt = new Date().toISOString()
    saveProject(project)
    setProjects(loadIndex())
  }, [])

  const deleteProject = useCallback((id: string) => {
    try {
      storageRemove(projectKey(id))
      const index = loadIndex().filter(p => p.id !== id)
      saveIndex(index)
      setProjects(index)
    } catch {}
  }, [])

  const getProject = useCallback((id: string): SavedProject | null => {
    return loadProject(id)
  }, [])

  const exportProjectFile = useCallback((id: string) => {
    const project = loadProject(id)
    if (!project) return
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.easystitch`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }, [])

  const importProjectFile = useCallback((file: File): Promise<SavedProject> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string)
          if (!parsed.pattern || !parsed.pattern.grid || !parsed.pattern.palette) {
            reject(new Error('File doesn\'t look like an CraftWabi project'))
            return
          }
          const height = parsed.pattern.meta?.height ?? parsed.pattern.grid?.length ?? 0
          const rowProgress = Array.isArray(parsed.rowProgress) && parsed.rowProgress.length === height
            ? parsed.rowProgress
            : new Array(height).fill(false)
          const project: SavedProject = {
            ...parsed,
            id:            generateId(),
            updatedAt:     new Date().toISOString(),
            rowProgress,
            completedRows: rowProgress.filter(Boolean).length,
            totalRows:     height,
          }
          saveProject(project)
          setProjects(loadIndex())
          resolve(project)
        } catch {
          reject(new Error('Could not read file — make sure it\'s a valid CraftWabi file'))
        }
      }
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsText(file)
    })
  }, [])

  return {
    projects,
    createProject,
    updateProgress,
    renameProject,
    deleteProject,
    getProject,
    exportProjectFile,
    importProjectFile,
  }
}
