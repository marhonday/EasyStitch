'use client'

export default function FaithFooter() {
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
      <div style={{ display: 'flex', gap: 16 }}>
        <a
          href="/privacy"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0', textDecoration: 'none' }}
        >
          Privacy
        </a>
        <a
          href="/terms"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0', textDecoration: 'none' }}
        >
          Terms
        </a>
      </div>
    </footer>
  )
}
