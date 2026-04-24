'use client'

import { usePathname } from 'next/navigation'

export default function FaithFooter() {
  const pathname = usePathname()

  // Tracker detail pages have their own Privacy/Terms line inside the right panel
  if (pathname?.match(/^\/track\/.+/)) return null

  return (
    <footer style={{
      width: '100%',
      padding: '16px 20px',
      textAlign: 'center',
      background: '#FAF6EF',
    }}>
      <a href="/privacy" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', textDecoration: 'none', marginRight: 16 }}>
        Privacy
      </a>
      <a href="/terms" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', textDecoration: 'none' }}>
        Terms
      </a>
    </footer>
  )
}
