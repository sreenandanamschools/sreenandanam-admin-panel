'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bell, Search, User } from 'lucide-react'

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-6 ml-0 md:ml-64 gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 h-9 bg-slate-100 border-0"
            />
          </div>
        </div>

        {/* Right side icons */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
