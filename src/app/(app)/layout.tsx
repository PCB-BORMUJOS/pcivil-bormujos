import { Sidebar, Header } from '@/components/layout'
import InactivityGuard from '@/components/InactivityGuard'
import AgentePanel from '@/components/AgentePanel'
import Script from 'next/script'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="page-container">
          <Header />
          <main className="p-6">
            {children}
            <InactivityGuard />
            <AgentePanel />
          </main>
        </div>
      </div>
    </>
  )
}