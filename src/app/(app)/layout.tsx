import { Sidebar } from '@/components/layout'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="page-container">
        {children}
      </main>
    </div>
  )
}
