'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Users, BookOpen, ClipboardCheck, Loader2, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface ReportData {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  totalEnrollments: number
  attendanceByStatus: { name: string; value: number }[]
  studentsByClass: { name: string; value: number }[]
}

export default function ReportsPage() {
  const supabase = createClient()
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReports() {
      setIsLoading(true); setError(null)
      try {
        // Get active academic year
        const { data: activeYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .single()

        const [
          { count: totalStudents },
          { count: activeStudents },
          { count: totalTeachers },
          { data: attendanceRecords },
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('status').limit(2000),
        ])

        // Attendance by status
        const attCount: Record<string, number> = { Present: 0, Absent: 0, Late: 0, 'Half-day': 0 }
        attendanceRecords?.forEach(a => { attCount[a.status] = (attCount[a.status] || 0) + 1 })
        const attendanceByStatus = Object.entries(attCount).map(([name, value]) => ({ name, value }))

        // Students by class via enrollments (active year)
        let enrollmentsWithClasses: any[] = []
        let totalEnrollments = 0
        if (activeYear) {
          const { data } = await supabase
            .from('student_enrollments')
            .select('class_id, classes(class_name, section)')
            .eq('academic_year_id', activeYear.id)
            .eq('status', 'active')
          enrollmentsWithClasses = data || []
          totalEnrollments = enrollmentsWithClasses.length
        }

        const classMap: Record<string, number> = {}
        enrollmentsWithClasses.forEach(e => {
          if (e.classes) {
            const c = e.classes as any
            const name = c.section ? `${c.class_name} ${c.section}` : c.class_name
            classMap[name] = (classMap[name] || 0) + 1
          }
        })
        const studentsByClass = Object.entries(classMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)

        setData({
          totalStudents: totalStudents || 0,
          activeStudents: activeStudents || 0,
          totalTeachers: totalTeachers || 0,
          totalEnrollments,
          attendanceByStatus,
          studentsByClass,
        })
      } catch (e: any) { setError(e.message) }
      finally { setIsLoading(false) }
    }
    fetchReports()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
  }

  if (!data) return null

  const summaryCards = [
    { title: 'Total Students', value: data.totalStudents.toLocaleString(), sub: `${data.activeStudents} active`, icon: Users, color: 'blue' },
    { title: 'Total Teachers', value: data.totalTeachers.toLocaleString(), sub: 'Teaching staff', icon: BookOpen, color: 'green' },
    { title: 'Active Enrollments', value: data.totalEnrollments.toLocaleString(), sub: 'Current academic year', icon: GraduationCap, color: 'amber' },
    { title: 'Attendance Records', value: data.attendanceByStatus.reduce((s, a) => s + a.value, 0).toLocaleString(), sub: 'Total entries', icon: ClipboardCheck, color: 'purple' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-600 mt-1">School-wide performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${colorMap[card.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Class */}
        <Card>
          <CardHeader><CardTitle>Students by Class</CardTitle></CardHeader>
          <CardContent>
            {data.studentsByClass.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                <p className="text-sm">No class data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.studentsByClass} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="Students" radius={[0, 4, 4, 0]}>
                    {data.studentsByClass.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Attendance Breakdown */}
        <Card>
          <CardHeader><CardTitle>Attendance Breakdown</CardTitle></CardHeader>
          <CardContent>
            {data.attendanceByStatus.every(a => a.value === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                <div className="text-center">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No attendance data yet</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.attendanceByStatus} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.attendanceByStatus.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#ef4444', '#f59e0b', '#3b82f6'][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
