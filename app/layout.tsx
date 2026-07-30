import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Papan Status Tim',
  description: 'Lihat status kerja tim secara real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}
