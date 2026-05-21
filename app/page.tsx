'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          redirect('/dashboard')
        } else {
          redirect('/auth/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        redirect('/auth/login')
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">🏫</div>
        <h1 className="text-4xl font-bold text-slate-900">School ERP</h1>
        <p className="text-slate-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
