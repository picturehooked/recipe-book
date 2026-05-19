import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Header } from '@/components/layout/Header'
import './globals.css'

export const metadata: Metadata = {
  title:       { default: 'Recipe Drawer', template: '%s | Recipe Drawer' },
  description: 'A personal recipe repository and kitchen reference',
  manifest:    '/manifest.json',
  icons: {
    icon:     [
      { url: '/favicon.ico',  sizes: 'any' },
      { url: '/icon-32.png',  sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png',  sizes: '16x16', type: 'image/png' },
    ],
    apple:    [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width:              'device-width',
  initialScale:       1,
  maximumScale:       5,
  themeColor:         [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)',  color: '#111827' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className="min-h-screen bg-parchment-50 dark:bg-slate-900 text-zinc-900 dark:text-zinc-100 antialiased">
        <ThemeProvider>
          <Header />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
