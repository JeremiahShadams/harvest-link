import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'HarvestLink — Good food, a little closer',
    template: '%s | HarvestLink',
  },
  description: 'Discover nearby harvests, order directly from local farmers, and build a clearer record of farm activity with HarvestLink.',
  applicationName: 'HarvestLink',
  appleWebApp: { capable: true, title: 'HarvestLink', statusBarStyle: 'default' },
  openGraph: {
    title: 'HarvestLink — Good food, a little closer',
    description: 'Meet the people who grow your food, and bring nearby harvests to your table.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#f5f6ef',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
