import type { Metadata } from 'next'
import { Inter, Barlow, Barlow_Semi_Condensed } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

// Tipografía del Parte de Revisión de Feria. El documento oficial está compuesto
// en Barlow y Barlow Semi Condensed: sin ellas la hoja no puede ser fiel.
// next/font las descarga en el build y las autoaloja, sin llamadas a Google.
const barlow = Barlow({
  subsets: ['latin'], weight: ['400', '500', '600', '700', '800'],
  variable: '--fuente-barlow', display: 'swap',
})
const barlowCond = Barlow_Semi_Condensed({
  subsets: ['latin'], weight: ['500', '600', '700'],
  variable: '--fuente-barlow-cond', display: 'swap',
})

export const metadata: Metadata = {
  title: 'Protección Civil Bormujos',
  description: 'Sistema de gestión para Protección Civil de Bormujos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body className={`${inter.className} ${barlow.variable} ${barlowCond.variable}`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}