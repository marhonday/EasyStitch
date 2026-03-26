import { AdvancedPatternProvider } from '@/context/AdvancedPatternContext'

export default function AdvancedLayout({ children }: { children: React.ReactNode }) {
  return <AdvancedProviderWrapper>{children}</AdvancedProviderWrapper>
}

function AdvancedProviderWrapper({ children }: { children: React.ReactNode }) {
  return <AdvancedPatternProvider>{children}</AdvancedPatternProvider>
}
