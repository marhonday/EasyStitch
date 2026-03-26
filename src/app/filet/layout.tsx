import { FiletPatternProvider } from '@/context/FiletPatternContext'

export default function FiletLayout({ children }: { children: React.ReactNode }) {
  return <FiletProviderWrapper>{children}</FiletProviderWrapper>
}

function FiletProviderWrapper({ children }: { children: React.ReactNode }) {
  return <FiletPatternProvider>{children}</FiletPatternProvider>
}
