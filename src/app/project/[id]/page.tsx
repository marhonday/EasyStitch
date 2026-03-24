'use client'

/**
 * /project/[id] — The main progress tracker.
 * Row-by-row checklist with pattern canvas, yarn estimator, and save-to-file.
 * Designed for tablet-width use while crocheting.
 */

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useProjectStorage, SavedProject } from '@/hooks/useProjectStorage'
import { generateInstructions } from '@/modules/instructions/generateInstructions'
import { estimateYarn } from '@/modules/yarn/yarnEstimator'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import { useRef } from 'react'

export default function ProjectPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = params.id as string

  const { getProject, updateProgress, renameProject, exportProjectFile } = useProjectStorage()
  const [project, setProject]     = useState<SavedProject | null>(null)
  const [editing, setEditing]     = useState(false)
  const [nameVal, setNameVal]     = useState('')
  const [activeTab, setActiveTab] = useState<'rows' | 'yarn' | 'grid'>('rows')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const p = getProject(id)
    if (!p) { router.push('/project'); return }
    setProject(p)
    setNameVal(p.name)
  }, [id, getProject, router])

  useEffect(() => {
    if (project && canvasRef.current && activeTab === 'grid') {
      drawPatternToCanvas(canvasRef.current, project.pattern, { cellSize: 10, gap: 1, showSymbols: false })
    }
  }, [project, activeTab])

  function toggleRow(rowIdx: number) {
    if (!project) return
    const newDone = !project.rowProgress[rowIdx]
    updateProgress(id, rowIdx, newDone)
    setProject(prev => {
      if (!prev) return prev
      const newProgress = [...prev.rowProgress]
      newProgress[rowIdx] = newDone
      return {
        ...prev,
        rowProgress:   newProgress,
        completedRows: newProgress.filter(Boolean).length,
      }
    })
  }

  function saveName() {
    if (!project || !nameVal.trim()) return
    renameProject(id, nameVal.trim())
    setProject(prev => prev ? { ...prev, name: nameVal.trim() } : prev)
    setEditing(false)
  }

  const instructions = useMemo(() =>
    project ? generateInstructions(project.pattern) : [],
    [project]
  )

  const yarnEstimate = useMemo(() =>
    project ? estimateYarn(project.pattern) : null,
    [project]
  )

  if (!project) {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#9A8878' }}>Loading…</p>
      </main>
    )
  }

  const pct = Math.round((project.completedRows / project.totalRows) * 100)
  const done = pct === 100

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid #EDE4D8', padding: '14px 20px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button
              onClick={() => router.push('/project')}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer', padding: 0 }}
            >
              ← My Patterns
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => exportProjectFile(id)}
                style={{ background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '7px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', cursor: 'pointer' }}
              >
                💾 Save to my Patterns
              </button>
              <button
                onClick={() => router.push('/')}
                style={{ background: '#C4614A', border: 'none', borderRadius: 10, padding: '7px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                + New Pattern
              </button>
            </div>
          </div>

          {/* Project name */}
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
                style={{ flex: 1, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218', border: '1.5px solid #C4614A', borderRadius: 8, padding: '4px 8px', background: 'white' }}
              />
              <button onClick={saveName} style={{ background: '#C4614A', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: '#FAF6EF', border: 'none', borderRadius: 8, padding: '6px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer', color: '#9A8878' }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>
                {project.name}
              </h1>
              <span style={{ fontSize: 14, color: '#C8BFB0' }}>✏️</span>
            </button>
          )}

          {/* Progress bar */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                {project.completedRows} of {project.totalRows} rows complete
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: done ? '#4A9050' : '#C4614A' }}>
                {done ? '🎉 Finished!' : `${pct}%`}
              </span>
            </div>
            <div style={{ height: 8, background: '#F2EAD8', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: done ? '#4A9050' : '#C4614A', borderRadius: 4, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid #EDE4D8' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex' }}>
          {([['rows', '📋 Rows'], ['grid', '🔲 Grid'], ['yarn', '🧶 Yarn']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px 8px', background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '2.5px solid #C4614A' : '2.5px solid transparent',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#C4614A' : '#9A8878',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 16px 60px' }}>

        {/* ── ROWS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'rows' && (
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 12, padding: '0 4px' }}>
              Tap a row to mark it complete. Row 1 = bottom of your pattern.
            </p>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Next incomplete', action: () => {
                  const next = project.rowProgress.findIndex(r => !r)
                  if (next >= 0) document.getElementById(`row-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }},
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} style={{ background: 'white', border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '8px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', cursor: 'pointer' }}>
                  {btn.label} →
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {instructions.map((row, i) => {
                const isDone = project.rowProgress[i] ?? false
                return (
                  <button
                    id={`row-${i}`}
                    key={i}
                    onClick={() => toggleRow(i)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px',
                      background: isDone ? 'rgba(74,144,80,0.06)' : 'white',
                      border: `1.5px solid ${isDone ? 'rgba(74,144,80,0.25)' : '#EDE4D8'}`,
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${isDone ? '#4A9050' : '#E4D9C8'}`,
                      background: isDone ? '#4A9050' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      {isDone && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row label */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: isDone ? '#4A9050' : '#2C2218' }}>
                          {row.label}{row.isFirstRow ? ' — Start here' : ''}
                        </span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                          {row.totalStitches} sts
                        </span>
                      </div>

                      {/* Run segments */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {row.runs.map((run, ri) => (
                          <span key={ri} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: `${run.hex}22`, border: `1.5px solid ${run.hex}55`,
                            borderRadius: 6, padding: '2px 7px',
                            fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2C2218',
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: run.hex, display: 'inline-block' }} />
                            {run.count} {run.symbol}
                          </span>
                        ))}
                      </div>

                      {row.carriedColors && row.carriedColors.length > 0 && (
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 4, fontStyle: 'italic' }}>
                          Carry: {row.carriedColors.join(', ')}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── GRID TAB ───────────────────────────────────────────────── */}
        {activeTab === 'grid' && (
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 12 }}>
              Your full pattern — pinch to zoom on tablet.
            </p>
            <div style={{ background: 'white', borderRadius: 16, padding: 12, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', overflowX: 'auto' }}>
              <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', imageRendering: 'pixelated' }} />
            </div>

            {/* Color key */}
            <div style={{ marginTop: 16, background: 'white', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(44,34,24,0.07)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Colour Key</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {project.pattern.palette.map((color, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: color.hex, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
                      {color.symbol}
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2C2218' }}>
                      {color.label ?? `Colour ${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── YARN TAB ───────────────────────────────────────────────── */}
        {activeTab === 'yarn' && yarnEstimate && (
          <div>
            {/* Total */}
            <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', marginBottom: 14, textAlign: 'center' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 4 }}>Total yarn needed</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#C4614A' }}>
                {yarnEstimate.totalYardsMin.toLocaleString()}–{yarnEstimate.totalYardsMax.toLocaleString()} yds
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
                Approx {yarnEstimate.totalSkeins} standard skeins (worsted weight)
              </p>
            </div>

            {/* Per color */}
            <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', marginBottom: 14 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Per colour</p>
              {yarnEstimate.perColor.map((est, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < yarnEstimate.perColor.length - 1 ? '1px solid #F2EAD8' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: est.hex, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 6px rgba(44,34,24,0.15)' }}>
                    {project.pattern.palette[i]?.symbol}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218', marginBottom: 2 }}>
                      {est.colorName}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                      {est.label}
                    </p>
                  </div>
                  <div style={{ background: '#FAF6EF', borderRadius: 8, padding: '4px 10px', textAlign: 'right' }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2C2218' }}>{est.yards}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>yds</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Brand matching teaser */}
            <div style={{ background: 'rgba(196,97,74,0.05)', border: '1.5px dashed rgba(196,97,74,0.25)', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 24 }}>🏷️</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 2 }}>Brand colour matching</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>Lion Brand, Red Heart & Caron matches coming soon</p>
              </div>
              <div style={{ marginLeft: 'auto', background: '#FAF6EF', borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#C4614A' }}>Soon</span>
              </div>
            </div>

            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#B8AAA0', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
              {yarnEstimate.note}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
