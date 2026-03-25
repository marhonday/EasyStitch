'use client'

/**
 * FaithFooter — a quiet verse strip that sits at the bottom of every page.
 * Rotates through KJV verses daily (day-of-year mod verses length).
 */

const VERSES = [
  { text: 'Commit thy works unto the LORD, and thy thoughts shall be established.', ref: 'Proverbs 16:3' },
  { text: 'She layeth her hands to the spindle, and her hands hold the distaff.', ref: 'Proverbs 31:19' },
  { text: 'For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.', ref: 'Ephesians 2:10' },
  { text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.', ref: 'Colossians 3:23' },
  { text: 'She maketh herself coverings of tapestry; her clothing is silk and purple.', ref: 'Proverbs 31:22' },
  { text: 'I can do all things through Christ which strengtheneth me.', ref: 'Philippians 4:13' },
  { text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'Whatsoever thy hand findeth to do, do it with thy might.', ref: 'Ecclesiastes 9:10' },
  { text: 'The LORD shall preserve thy going out and thy coming in from this time forth, and even for evermore.', ref: 'Psalm 121:8' },
  { text: 'In the beginning God created the heaven and the earth.', ref: 'Genesis 1:1' },
]

function CrossIcon({ size = 20, opacity = 0.55 }: { size?: number; opacity?: number }) {
  const w = size
  const h = Math.round(size * 1.2)
  const arm = Math.round(size * 0.18)
  const crossX = Math.round((w - arm) / 2)
  const crossY = Math.round(h * 0.28)
  const barY   = Math.round(h * 0.3)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden>
      <rect x={crossX} y={0}      width={arm} height={h}      rx={Math.round(arm / 2)} fill="#C4614A" opacity={opacity} />
      <rect x={0}      y={barY}   width={w}   height={arm}    rx={Math.round(arm / 2)} fill="#C4614A" opacity={opacity} />
    </svg>
  )
}

export default function FaithFooter() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  )
  const verse = VERSES[dayOfYear % VERSES.length]

  return (
    <footer style={{
      borderTop: '1px solid #EDE4D8',
      background: '#FAF6EF',
      padding: '14px 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      textAlign: 'center',
    }}>
      <CrossIcon size={18} opacity={0.45} />
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 12,
        fontStyle: 'italic',
        color: '#9A8878',
        lineHeight: 1.7,
        maxWidth: 320,
        margin: 0,
      }}>
        &ldquo;{verse.text}&rdquo;
      </p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 10,
        fontWeight: 600,
        color: '#C8BFB0',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        {verse.ref} &middot; KJV
      </p>
    </footer>
  )
}
