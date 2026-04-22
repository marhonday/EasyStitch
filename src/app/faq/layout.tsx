import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — CraftWabi Crochet Pattern Generator & Row Counter',
  description: 'Answers to common questions about CraftWabi — free online crochet row counter, how to convert photos to C2C graphgan patterns, which stitch style suits your photo, and more.',
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
