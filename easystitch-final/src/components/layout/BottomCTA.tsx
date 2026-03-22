'use client'

interface BottomCTAProps {
  primaryLabel:     string
  onPrimary:        () => void
  secondaryLabel?:  string
  onSecondary?:     () => void
  primaryDisabled?: boolean
  isLoading?:       boolean
}

export default function BottomCTA({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled = false,
  isLoading       = false,
}: BottomCTAProps) {
  const disabled = primaryDisabled || isLoading

  return (
    <div style={{
      position:   'fixed',
      bottom:     0,
      left:       '50%',
      transform:  'translateX(-50%)',
      width:      '100%',
      maxWidth:   430,
      padding:    'env(safe-area-inset-bottom, 0px)',
      zIndex:     50,
    }}>
      {/* Gradient fade above buttons so content scrolls cleanly under */}
      <div style={{
        background: 'linear-gradient(to bottom, transparent, #FAF6EF 40%)',
        padding:    '24px 20px 20px',
      }}>
        {/* PRIMARY */}
        <button
          onClick={onPrimary}
          disabled={disabled}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            8,
            width:          '100%',
            padding:        '17px 24px',
            background:     disabled ? '#E4D9C8' : '#C4614A',
            color:          disabled ? '#A89888' : '#FFFFFF',
            border:         'none',
            borderRadius:   16,
            fontFamily:     "'DM Sans', sans-serif",
            fontSize:       16,
            fontWeight:     600,
            cursor:         disabled ? 'not-allowed' : 'pointer',
            boxShadow:      disabled ? 'none' : '0 4px 20px rgba(196,97,74,0.30)',
            transition:     'background 0.15s ease, box-shadow 0.15s ease',
            letterSpacing:  '0.01em',
          }}
        >
          {isLoading ? (
            <>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                style={{ animation: 'cta-spin 0.8s linear infinite', flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Working on it…
            </>
          ) : primaryLabel}
        </button>

        {/* SECONDARY */}
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            style={{
              display:        'block',
              width:          '100%',
              marginTop:      10,
              padding:        '13px 24px',
              background:     'white',
              color:          '#6B5744',
              border:         '1.5px solid #E4D9C8',
              borderRadius:   14,
              fontFamily:     "'DM Sans', sans-serif",
              fontSize:       14,
              fontWeight:     500,
              cursor:         'pointer',
              textAlign:      'center',
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>

      <style>{`
        @keyframes cta-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
