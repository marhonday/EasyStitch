import { DiamondPaintingProvider } from '@/context/DiamondPaintingContext'

export default function DiamondPaintingLayout({ children }: { children: React.ReactNode }) {
  return <DiamondPaintingProvider>{children}</DiamondPaintingProvider>
}
