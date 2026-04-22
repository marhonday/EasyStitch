import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — EasyStitch',
  description: 'EasyStitch Privacy Policy. Your photos are never uploaded to any server — all processing happens locally in your browser. We collect only what is needed to process your payment.',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
