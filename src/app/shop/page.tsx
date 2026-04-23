'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { fetchPublishedIndex, ShopIndexTemplate } from '@/lib/shopStore'

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

const STYLE_LABEL: Record<string, string> = {
  singleCrochet:    'Single Crochet',
  c2c:              'C2C',
  tapestry:         'Tapestry',
  mosaic:           'Mosaic',
  crossStitch:      'Cross Stitch',
  knitting:         'Knitting',
  filetCrochet:     'Filet',
}

const STYLE_SHORT: Record<string, string> = {
  singleCrochet: 'SC',
  c2c:           'C2C',
  tapestry:      'Tap',
  mosaic:        'Mos',
  crossStitch:   'XS',
  knitting:      'Knit',
  filetCrochet:  'Filet',
}

function priceRange(t: ShopIndexTemplate): string {
  if (t.variants.length === 0) return '$—'
  const prices = t.variants.map(v => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `$${(min / 100).toFixed(2)}`
  return `$${(min / 100).toFixed(2)} – $${(max / 100).toFixed(2)}`
}

function TemplateCard({
  template,
  onStyleClick,
  onClick,
}: {
  template: ShopIndexTemplate
  onStyleClick: (style: string) => void
  onClick: () => void
}) {
  const styles  = [...new Set(template.variants.map(v => v.stitchStyle))]
  const sizes   = [...new Set(template.variants.map(v => v.label))]
  const range   = priceRange(template)
  const stack   = template.variants.length > 1

  return (
    <div style={{ position: 'relative', paddingBottom: stack ? 6 : 0 }}>
      {/* Stacked depth cards — suggests multiple variants */}
      {stack && (
        <>
          <div style={{
            position: 'absolute', bottom: 0, left: 6, right: -6,
            height: '100%', background: 'white', borderRadius: 18,
            border: '1.5px solid #EDE4D8', zIndex: 0,
          }} />
          {template.variants.length > 2 && (
            <div style={{
              position: 'absolute', bottom: -5, left: 10, right: -10,
              height: '100%', background: '#F5EFE6', borderRadius: 18,
              border: '1.5px solid #EDE4D8', zIndex: -1,
            }} />
          )}
        </>
      )}

      {/* Main card */}
      <div
        onClick={onClick}
        style={{
          position: 'relative', zIndex: 1,
          background: 'white', borderRadius: 18,
          boxShadow: '0 2px 14px rgba(44,34,24,0.08)',
          overflow: 'hidden', cursor: 'pointer',
          border: '1.5px solid #EDE4D8',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 22px rgba(44,34,24,0.12)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLDivElement).style.transform = ''
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 14px rgba(44,34,24,0.08)'
        }}
      >
        {/* Thumbnail */}
        <div style={{ aspectRatio: '1', background: '#F2EAD8', position: 'relative', overflow: 'hidden' }}>
          {template.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.thumbnail}
              alt={template.title}
              loading="lazy"
              decoding="async"
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
          {stack && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(44,34,24,0.7)', borderRadius: 8, padding: '2px 7px' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, color: 'white' }}>
                {template.variants.length} variants
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 12px' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: '#2C2218', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template.title}
          </p>

          {/* Style chips — clicking one filters the grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {styles.map(s => (
              <button
                key={s}
                onClick={e => { e.stopPropagation(); onStyleClick(s) }}
                title={`Filter by ${STYLE_LABEL[s] ?? s}`}
                style={{
                  padding: '2px 7px',
                  background: 'rgba(44,34,24,0.07)', border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
                  color: '#6B5744',
                }}
              >
                {STYLE_SHORT[s] ?? s}
              </button>
            ))}
          </div>

          {/* Sizes + price */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>
              {sizes.slice(0, 3).join(' · ')}{sizes.length > 3 ? ' …' : ''}
            </span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#C4614A' }}>
              {range}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const router    = useRouter()
  const [templates,    setTemplates]    = useState<ShopIndexTemplate[]>([])
  const [loading,      setLoading]      = useState(true)

  // Pending = what the user just clicked; active = what's actually filtered
  const [pendingCat,   setPendingCat]   = useState('all')
  const [pendingStyle, setPendingStyle] = useState('All Styles')
  const [activeCat,    setActiveCat]    = useState('all')
  const [activeStyle,  setActiveStyle]  = useState('All Styles')
  const [isFiltering,  setIsFiltering]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load index on mount
  useEffect(() => {
    fetchPublishedIndex().then(t => { setTemplates(t); setLoading(false) })
  }, [])

  // Debounce filter changes — 400ms lets user pick category + style before loading
  useEffect(() => {
    setIsFiltering(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setActiveCat(pendingCat)
      setActiveStyle(pendingStyle)
      setIsFiltering(false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [pendingCat, pendingStyle])

  const activeCategories = CATEGORIES.filter(c =>
    c === 'all' || templates.some(t => t.category === c)
  )

  const activeStyles = ['All Styles', ...Array.from(
    new Set(templates.flatMap(t => t.variants.map(v => v.stitchStyle)))
  ).sort()]

  const filtered = templates.filter(t => {
    const catMatch   = activeCat   === 'all'        || t.category === activeCat
    const styleMatch = activeStyle === 'All Styles' || t.variants.some(v => v.stitchStyle === activeStyle)
    return catMatch && styleMatch
  })

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 80px' }}>

        {/* Hero */}
        <div style={{ width: '100%', maxWidth: 460, textAlign: 'center', marginBottom: 14 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Ready-Made Patterns
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            Pre-gridded designs ready to stitch — pick your size, add a name if you like, and download instantly.
          </p>
        </div>

        {/* 🎨 Colour swap callout */}
        <div style={{
          width: '100%', maxWidth: 460, marginBottom: 18,
          background: 'linear-gradient(135deg, #2C2218 0%, #4A3828 100%)',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>🎨</div>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: 'white', marginBottom: 3 }}>
              Make it yours — swap any colour instantly
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              Every pattern has a live colour editor. Change the background, swap to your team&apos;s colours, or match any yarn you already own — before you buy.
            </p>
          </div>
        </div>

        {/* Filters */}
        {!loading && (
          <>
            {activeCategories.length > 1 && (
              <div style={{ width: '100%', maxWidth: 460, marginBottom: 8 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Category</p>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                    {activeCategories.map(c => (
                      <button
                        key={c}
                        onClick={() => setPendingCat(c)}
                        style={{
                          flexShrink: 0, padding: '7px 14px',
                          background: pendingCat === c ? '#C4614A' : 'white',
                          color:      pendingCat === c ? 'white' : '#6B5744',
                          border:     `1.5px solid ${pendingCat === c ? '#C4614A' : '#E4D9C8'}`,
                          borderRadius: 999,
                          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                          fontWeight: pendingCat === c ? 700 : 400, cursor: 'pointer',
                        }}
                      >
                        {CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeStyles.length > 2 && (
              <div style={{ width: '100%', maxWidth: 460, marginBottom: 12 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Stitch Style</p>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                    {activeStyles.map(s => (
                      <button
                        key={s}
                        onClick={() => setPendingStyle(s)}
                        style={{
                          flexShrink: 0, padding: '7px 14px',
                          background: pendingStyle === s ? '#2C2218' : 'white',
                          color:      pendingStyle === s ? 'white' : '#6B5744',
                          border:     `1.5px solid ${pendingStyle === s ? '#2C2218' : '#E4D9C8'}`,
                          borderRadius: 999,
                          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                          fontWeight: pendingStyle === s ? 700 : 400, cursor: 'pointer',
                        }}
                      >
                        {STYLE_LABEL[s] ?? s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results count */}
            <div style={{ width: '100%', maxWidth: 460, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: isFiltering ? '#C4614A' : '#9A8878', transition: 'color 0.2s' }}>
                {isFiltering ? 'Filtering…' : `${filtered.length} pattern${filtered.length !== 1 ? 's' : ''}${activeCat !== 'all' || activeStyle !== 'All Styles' ? ' matching filters' : ''}`}
              </p>
              {(pendingCat !== 'all' || pendingStyle !== 'All Styles') && (
                <button
                  onClick={() => { setPendingCat('all'); setPendingStyle('All Styles') }}
                  style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', cursor: 'pointer', fontWeight: 600 }}
                >
                  Clear filters ×
                </button>
              )}
            </div>
          </>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ width: '100%', maxWidth: 460, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 18, border: '1.5px solid #EDE4D8', overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(90deg, #F2EAD8 25%, #EDE4D4 50%, #F2EAD8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ height: 12, background: '#F2EAD8', borderRadius: 6, marginBottom: 8, width: '70%' }} />
                  <div style={{ height: 10, background: '#F2EAD8', borderRadius: 6, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div
            style={{
              width: '100%', maxWidth: 460,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
              opacity: isFiltering ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onStyleClick={s => setPendingStyle(s)}
                onClick={() => router.push(`/shop/${t.slug}`)}
              />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, gap: 10 }}>
            <div style={{ fontSize: 40 }}>🔍</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>No patterns match</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', textAlign: 'center', maxWidth: 260 }}>Try a different category or style.</p>
            <button onClick={() => { setPendingCat('all'); setPendingStyle('All Styles') }} style={{ marginTop: 4, padding: '10px 20px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 12 }}>
            <div style={{ fontSize: 52 }}>🧶</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>Patterns coming soon</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7, textAlign: 'center', maxWidth: 280 }}>
              We&apos;re adding new ready-made designs each week — football blankets, dog breeds, holidays, and more.
            </p>
            <button onClick={() => router.push('/create')} style={{ marginTop: 8, padding: '13px 24px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.25)' }}>
              Convert your own photo →
            </button>
          </div>
        )}

        {filtered.length > 0 && !loading && (
          <div style={{ width: '100%', maxWidth: 460, marginTop: 28, background: 'white', borderRadius: 18, border: '1.5px solid #EDE4D8', padding: '16px 18px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 4 }}>Don&apos;t see what you&apos;re looking for?</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 12, lineHeight: 1.6 }}>Upload any photo and CraftWabi turns it into a stitch-by-stitch pattern in seconds.</p>
            <button onClick={() => router.push('/create')} style={{ padding: '11px 24px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Convert your own photo
            </button>
          </div>
        )}

      </div>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </main>
  )
}
