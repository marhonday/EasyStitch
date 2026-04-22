import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — EasyStitch',
  description: 'EasyStitch Terms of Service. You own the patterns you generate. All image processing is private and happens in your browser — your photos are never uploaded to our servers.',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
