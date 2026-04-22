'use client'

import { usePathname } from 'next/navigation'
import { WIZARD_STEPS } from '@/lib/constants'

export default function StepIndicator() {
  const pathname = usePathname()
  const currentIndex = WIZARD_STEPS.findIndex(s => s.path === pathname)

  // Don't show on landing page
  if (currentIndex === -1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, padding: '12px 0 8px' }}>
      {WIZARD_STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent  = i === currentIndex

        return (
          <div key={step.path} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Dot + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 64 }}>
              <div style={{
                width:        isCurrent ? 24 : 10,
                height:       isCurrent ? 24 : 10,
                borderRadius: '50%',
                background:   isCurrent ? '#C4614A' : isComplete ? '#E4A898' : '#E4D9C8',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                transition:   'all 0.3s',
                flexShrink:   0,
              }}>
                {isCurrent && (
                  <span style={{ color: 'white', fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
                    {currentIndex + 1}
                  </span>
                )}
              </div>
              <span style={{
                fontFamily:  "'DM Sans', sans-serif",
                fontSize:    10,
                fontWeight:  isCurrent ? 700 : 400,
                color:       isCurrent ? '#C4614A' : isComplete ? '#C4A898' : '#C8BFB0',
                letterSpacing: '0.03em',
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line — between dots, vertically centered on dot */}
            {i < WIZARD_STEPS.length - 1 && (
              <div style={{
                height: 1, width: 20, marginTop: 11, flexShrink: 0,
                background: isComplete ? '#E4A898' : '#E4D9C8',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
