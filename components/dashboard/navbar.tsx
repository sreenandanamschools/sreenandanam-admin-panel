'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bell, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/academics': 'Academics',
  '/dashboard/students': 'Students',
  '/dashboard/teachers': 'Teachers',
  '/dashboard/classes': 'Classes',
  '/dashboard/attendance': 'Attendance',
  '/dashboard/attendance/reports': 'Attendance Reports',
  '/dashboard/announcements': 'Announcements',
  '/dashboard/events': 'Events',
  '/dashboard/news': 'News',
  '/dashboard/gallery': 'Gallery',
  '/dashboard/honorary-guests': 'Honorary Guests',
  '/dashboard/careers': 'Career Applications',
}

export function Navbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Dashboard'

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-6 ml-0 md:ml-64 gap-4">
        {/* Left: Page title */}
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 hidden sm:block">School Management Portal</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:block relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-9 h-9 bg-slate-100 border-0 focus-visible:bg-white text-sm"
            />
          </div>

          {/* Notification */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </Button>

          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
            A
          </div>
        </div>
      </div>
    </header>
  )
}
