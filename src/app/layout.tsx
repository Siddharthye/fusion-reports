import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FUSION — Duplicate Report Fusion & Corroboration Engine',
  description:
    'Fifty people report one fire; your ops screen shows one incident at 96% corroboration. Spatial-temporal-semantic clustering, confidence scoring, velocity escalation, and prank quarantine — as a drop-in REST + SSE service.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
