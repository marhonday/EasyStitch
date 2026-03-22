interface LoadingSpinnerProps {
  message?: string
}

export default function LoadingSpinner({ message = 'Just a moment…' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-8 text-center">
      {/* Animated yarn ball */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-cream-200" />
        <div className="absolute inset-0 rounded-full border-4 border-t-rose-DEFAULT border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full bg-rose-soft/20 flex items-center justify-center">
          <span className="text-xl">🧶</span>
        </div>
      </div>

      <p className="font-body text-ink/60 text-sm">{message}</p>
    </div>
  )
}
