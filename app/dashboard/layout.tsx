'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Navbar } from '@/components/dashboard/navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) setCollapsed(saved === 'true')

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        setCollapsed(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)

    const interval = setInterval(() => {
      const current = localStorage.getItem('sidebar-collapsed')
      if (current) setCollapsed(current === 'true')
    }, 500)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <main
        className={`min-h-[calc(100vh-65px)] transition-all duration-300 ${
          collapsed ? 'md:ml-[68px]' : 'md:ml-64'
        }`}
      >
        <div className="p-6 animate-in fade-in slide-in-from-top-1 duration-300">
          {children}
        </div>
      </main>
    </div>
  )
}
