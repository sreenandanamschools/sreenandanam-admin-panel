import { Sidebar } from '@/components/dashboard/sidebar'
import { Navbar } from '@/components/dashboard/navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <main className="md:ml-64 min-h-[calc(100vh-64px)]">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
