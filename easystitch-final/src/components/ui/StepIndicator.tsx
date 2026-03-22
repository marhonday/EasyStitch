'use client'

import { usePathname } from 'next/navigation'
import { WIZARD_STEPS } from '@/lib/constants'

export default function StepIndicator() {
  const pathname = usePathname()
  const currentIndex = WIZARD_STEPS.findIndex(s => s.path === pathname)

  // Don't show on landing page
  if (currentIndex === -1) return null

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {WIZARD_STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent  = i === currentIndex

        return (
          <div key={step.path} className="flex items-center gap-2">
            {/* Step dot */}
            <div
              className={[
                'rounded-full transition-all duration-300',
                isCurrent  ? 'w-6 h-6 bg-rose-DEFAULT shadow-soft flex items-center justify-center' : '',
                isComplete ? 'w-2.5 h-2.5 bg-rose-soft' : '',
                !isCurrent && !isComplete ? 'w-2.5 h-2.5 bg-cream-200' : '',
              ].join(' ')}
            >
              {isCurrent && (
                <span className="text-white text-[10px] font-body font-semibold">
                  {currentIndex + 1}
                </span>
              )}
            </div>

            {/* Connector line */}
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-4 rounded transition-colors duration-300',
                  isComplete ? 'bg-rose-soft' : 'bg-cream-200',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
