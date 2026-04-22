import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About CraftWabi — Free Photo to Stitch Pattern Generator',
  description: 'CraftWabi is a free browser-based tool for crochet, knitting, cross-stitch, and diamond painting. Convert any photo into a colour-by-colour stitch pattern. Your photos never leave your device.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
