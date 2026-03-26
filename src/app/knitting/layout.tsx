import { KnittingPatternProvider } from '@/context/KnittingPatternContext'

export default function KnittingLayout({ children }: { children: React.ReactNode }) {
  return <KnittingProviderWrapper>{children}</KnittingProviderWrapper>
}

function KnittingProviderWrapper({ children }: { children: React.ReactNode }) {
  return <KnittingPatternProvider>{children}</KnittingPatternProvider>
}
