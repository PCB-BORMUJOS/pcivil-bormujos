import { Sidebar, Header } from '@/components/layout'
import Script from 'next/script'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script 
        src="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        strategy="beforeInteractive"
      />
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="page-container">
          <Header />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}