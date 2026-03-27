import { PbnPatternProvider } from '@/context/PbnPatternContext'

export default function PbnLayout({ children }: { children: React.ReactNode }) {
  return <PbnPatternProvider>{children}</PbnPatternProvider>
}
