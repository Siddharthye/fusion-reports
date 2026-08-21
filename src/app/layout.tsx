import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

/* Self-hosted at build time by next/font — no runtime font requests, which
   matters for a module that must demo with the venue wifi off. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: 'FUSION — Duplicate Report Fusion & Corroboration Engine',
  description:
    'Fifty people report one fire; your ops screen shows one incident at 96% corroboration. Spatial-temporal-semantic clustering, confidence scoring, velocity escalation, and prank quarantine — as a drop-in REST + SSE service.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
