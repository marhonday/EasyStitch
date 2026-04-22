'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { getPublishedTemplates, ShopTemplate } from '@/lib/shopStore'

const CATEGORIES = ['all', 'sports', 'animals', 'holidays', 'baby', 'names', 'nature', 'other']

const CATEGORY_EMOJI: Record<string, string> = {
  all:      '🧶',
  sports:   '🏈',
  animals:  '🐾',
  holidays: '🎄',
  baby:     '🍼',
  names:    '✏️',
  nature:   '🌿',
  other:    '⭐',
}

function priceRange(t: ShopTemplate): string {
  if (t.variants.length === 0) return '$—'
  const prices = t.variants.map(v => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `$${(min / 100).toFixed(2)}`
  return `$${(min / 100).toFixed(2)} – $${(max / 100).toFixed(2)}`
}

function TemplateCard({ template, onClick }: { template: ShopTemplate; onClick: () => void }) {
  const range      = priceRange(template)
  const styleNames = [...new Set(template.variants.map(v => v.stitchStyle))]
  const sizes      = template.variants.length

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: 18,
        boxShadow: '0 2px 14px rgba(44,34,24,0.08)',
        overflow: 'hidden', cursor: 'pointer',
        border: '1.5px solid #EDE4D8',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 22px rgba(44,34,24,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 14px rgba(44,34,24,0.08)' }}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: '1', background: '#F2EAD8', position: 'relative', overflow: 'hidden' }}>
        {template.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnail}
            alt={template.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', imageRendering: 'pixelated' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
            {CATEGORY_EMOJI[template.category] ?? '🧶'}
          </div>
        )}
        {template.allowPersonalization && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(196,97,74,0.9)', borderRadius: 8, padding: '2px 7px' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.03em' }}>+ NAME</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#2C2218', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {template.title}
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sizes} size{sizes !== 1 ? 's' : ''} · {styleNames.join(' / ')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#C4614A' }}>
            {range}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#C4614A', background: 'rgba(196,97,74,0.08)', borderRadius: 8, padding: '3px 8px' }}>
            Buy →
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const router    = useRouter()
  const [templates, setTemplates] = useState<ShopTemplate[]>([])
  const [category,  setCategory]  = useState('all')

  useEffect(() => { setTemplates(getPublishedTemplates()) }, [])

  const filtered = category === 'all'
    ? templates
    : templates.filter(t => t.category === category)

  // Only show categories that have at least one template
  const activeCategories = CATEGORIES.filter(c =>
    c === 'all' || templates.some(t => t.category === c)
  )

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 80px' }}>

        {/* Hero */}
        <div style={{ width: '100%', maxWidth: 460, textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Ready-Made Patterns
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            Pre-gridded designs ready to stitch — pick your size, add a name if you like, and download instantly.
          </p>
        </div>

        {/* Category filter */}
        {activeCategories.length > 1 && (
          <div style={{ width: '100%', maxWidth: 460, overflowX: 'auto', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
              {activeCategories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    background: category === c ? '#C4614A' : 'white',
                    color:      category === c ? 'white' : '#6B5744',
                    border:     `1.5px solid ${category === c ? '#C4614A' : '#E4D9C8'}`,
                    borderRadius: 999,
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: category === c ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 ? (
          <div style={{ width: '100%', maxWidth: 460, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onClick={() => router.push(`/shop/${t.slug}`)}
              />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 12 }}>
            <div style={{ fontSize: 52 }}>🧶</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>
              Patterns coming soon
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7, textAlign: 'center', maxWidth: 280 }}>
              We&apos;re adding new ready-made designs each week — football blankets, dog breeds, holidays, and more.
            </p>
            <button
              onClick={() => router.push('/upload')}
              style={{ marginTop: 8, padding: '13px 24px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.25)' }}
            >
              Make your own pattern →
            </button>
          </div>
        )}

        {/* CTA — make your own */}
        {filtered.length > 0 && (
          <div style={{ width: '100%', maxWidth: 460, marginTop: 28, background: 'white', borderRadius: 18, border: '1.5px solid #EDE4D8', padding: '16px 18px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 4 }}>
              Don&apos;t see what you&apos;re looking for?
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 12, lineHeight: 1.6 }}>
              Upload any photo and CraftWabi will turn it into a stitch-by-stitch pattern in seconds.
            </p>
            <button
              onClick={() => router.push('/upload')}
              style={{ padding: '11px 24px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              + Make a custom pattern
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
