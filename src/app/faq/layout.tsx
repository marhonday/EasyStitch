import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — EasyStitch Crochet Pattern Generator & Row Counter',
  description: 'Answers to common questions about EasyStitch — free online crochet row counter, how to convert photos to C2C graphgan patterns, which stitch style suits your photo, and more.',
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
