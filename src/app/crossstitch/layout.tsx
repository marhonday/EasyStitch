import { CrossStitchPatternProvider } from '@/context/CrossStitchPatternContext'

export default function CrossStitchLayout({ children }: { children: React.ReactNode }) {
  return <CrossStitchPatternProvider>{children}</CrossStitchPatternProvider>
}
