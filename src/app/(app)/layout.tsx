import { Sidebar, Header } from '@/components/layout'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="page-container">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}