'use client'

/**
 * /project — Project list page
 * Shows all saved projects with progress bars and quick-resume.
 */

import { useRouter } from 'next/navigation'
import { useState, useEffect }  from 'react'
import { useProjectStorage } from '@/hooks/useProjectStorage'
import { ProjectMeta } from '@/hooks/useProjectStorage'
import { storageIsPersistent } from '@/lib/storage'
import Header from '@/components/layout/Header'

export default function ProjectListPage() {
  const router = useRouter()
  const { projects, deleteProject, importProjectFile } = useProjectStorage()
  const [importing, setImporting] = useState(false)
  const [isPersistent, setIsPersistent] = useState(true)

  useEffect(() => {
    setIsPersistent(storageIsPersistent())
  }, [])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const project = await importProjectFile(file)
      router.push(`/project/${project.id}`)
    } catch {
      alert('Could not load that file. Make sure it\'s a .easystitch file.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF' }}>
      <Header />

      {!isPersistent && (
        <div style={{ width: '100%', maxWidth: 680, margin: '0 auto 0', padding: '0 20px', boxSizing: 'border-box' }}>
          <div style={{ background: 'rgba(196,97,74,0.08)', border: '1px solid rgba(196,97,74,0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', lineHeight: 1.5 }}>
              <strong>Private Browsing detected.</strong> Projects won't be saved between sessions. Use the "Save to my Patterns" button to keep your progress.
            </p>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 20px 0', maxWidth: 680, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218' }}>
            My Patterns
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', marginTop: 2 }}>
            {projects.length} saved pattern{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/upload')}
          style={{ background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Pattern
        </button>
      </div>

      <div style={{ padding: '20px', maxWidth: 680, margin: '0 auto' }}>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🧶</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#2C2218', marginBottom: 8 }}>
              No projects yet
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9A8878', marginBottom: 28 }}>
              Create a pattern and save it to track your progress here.
            </p>
            <button
              onClick={() => router.push('/upload')}
              style={{ background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Make My First Pattern →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => router.push(`/project/${p.id}`)}
                onDelete={() => {
                  if (confirm(`Delete "${p.name}"? This can't be undone.`)) {
                    deleteProject(p.id)
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Import file */}
        <div style={{ marginTop: 24, borderTop: '1px solid #EDE4D8', paddingTop: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="file"
              accept=".easystitch,.easystitch.json,.json,application/json"
              style={{ display: 'none' }}
              onChange={handleImport}
              disabled={importing}
            />
            <div style={{
              background: 'white', border: '1.5px dashed #E4D9C8',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%',
            }}>
              <span style={{ fontSize: 20 }}>📂</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744' }}>
                {importing ? 'Loading…' : 'Open a saved .easystitch file'}
              </span>
            </div>
          </label>
        </div>
      </div>
    </main>
  )
}

function ProjectCard({ project, onOpen, onDelete }: {
  project:  ProjectMeta
  onOpen:   () => void
  onDelete: () => void
}) {
  const pct = project.totalRows > 0
    ? Math.round((project.completedRows / project.totalRows) * 100)
    : 0
  const done = pct === 100

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(44,34,24,0.07)',
      overflow: 'hidden',
    }}>
      <div
        onClick={onOpen}
        style={{ width: '100%', padding: '16px', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#2C2218', marginBottom: 3 }}>
              {project.name}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
              {project.completedRows} of {project.totalRows} rows · {new Date(project.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div style={{
            background: done ? 'rgba(89,158,90,0.12)' : 'rgba(196,97,74,0.08)',
            borderRadius: 8, padding: '4px 10px',
          }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: done ? '#4A9050' : '#C4614A' }}>
              {done ? '✓ Done' : `${pct}%`}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: '#F2EAD8', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: done ? '#4A9050' : '#C4614A',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        <button
          onClick={onOpen}
          style={{ flex: 1, padding: '9px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {done ? 'View Pattern' : 'Continue →'}
        </button>
        <button
          onClick={onDelete}
          style={{ padding: '9px 14px', background: '#FAF6EF', color: '#C8BFB0', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
