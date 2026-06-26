'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, BookOpen, TrendingUp, ClipboardEdit, UserPlus, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    avgAttendance: 0,
  })
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [classDistributionData, setClassDistributionData] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true)
        
        // Get active academic year
        const { data: activeYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .single()

        // 1. Active enrolled students count
        let studentsCount = 0
        if (activeYear) {
          const { count } = await supabase
            .from('student_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('academic_year_id', activeYear.id)
            .eq('status', 'active')
          studentsCount = count || 0
        }
          
        // 2. Teachers count
        const { count: teachersCount } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          
        // 4. Attendance Stats
        const { data: attendanceRecords } = await supabase
          .from('attendance')
          .select('date, status')
          .order('date', { ascending: false })
          .limit(500)
          
        let totalPresent = 0
        let totalRecords = 0
        const dailyAttendance: Record<string, { present: number, total: number }> = {}
        
        if (attendanceRecords) {
          totalRecords = attendanceRecords.length
          attendanceRecords.forEach(record => {
            if (record.status === 'Present') totalPresent++
            const dateStr = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })
            if (!dailyAttendance[dateStr]) dailyAttendance[dateStr] = { present: 0, total: 0 }
            dailyAttendance[dateStr].total++
            if (record.status === 'Present') dailyAttendance[dateStr].present++
          })
        }
        
        const avgAtt = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0
        const formattedAttendanceData = Object.keys(dailyAttendance).map(day => ({
          name: day,
          attendance: Math.round((dailyAttendance[day].present / dailyAttendance[day].total) * 100)
        }))
        
        // 5. Class Distribution (active year enrollments)
        let enrollmentsWithClasses: any[] = []
        if (activeYear) {
          const { data } = await supabase
            .from('student_enrollments')
            .select('class_id, classes(class_name, section)')
            .eq('academic_year_id', activeYear.id)
            .eq('status', 'active')
          enrollmentsWithClasses = data || []
        }
          
        const classCount: Record<string, number> = {}
        if (enrollmentsWithClasses) {
          enrollmentsWithClasses.forEach(enroll => {
            if (enroll.classes) {
              const cls = enroll.classes as unknown as { class_name: string; section: string | null }
              const className = cls.section ? `${cls.class_name} ${cls.section}` : cls.class_name
              classCount[className] = (classCount[className] || 0) + 1
            }
          })
        }
        
        const formattedClassData = Object.keys(classCount).map(className => ({
          name: className,
          value: classCount[className]
        }))
        
        setStats({
          totalStudents: studentsCount || 0,
          totalTeachers: teachersCount || 0,
          avgAttendance: avgAtt,
        })
        setAttendanceData(formattedAttendanceData.length ? formattedAttendanceData : [{ name: 'No Data', attendance: 0 }])
        setClassDistributionData(formattedClassData.length ? formattedClassData : [{ name: 'No Data', value: 1 }])
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Total Teachers',
      value: stats.totalTeachers.toString(),
      icon: BookOpen,
      color: 'green',
    },
    {
      title: 'Avg Attendance',
      value: `${stats.avgAttendance}%`,
      icon: TrendingUp,
      color: 'purple',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back! Here&apos;s your school overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const iconColors: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600 ring-blue-600/20',
            green: 'bg-emerald-50 text-emerald-600 ring-emerald-600/20',
            purple: 'bg-violet-50 text-violet-600 ring-violet-600/20',
          }
          return (
            <div key={stat.title} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{stat.title}</span>
                <div className={`p-2.5 rounded-xl ring-1 ${iconColors[stat.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
            </div>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance Trend */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Attendance Trend (Weekly)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Average attendance percentage by day</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ fill: '#0f172a', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#0f172a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Distribution */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Student Distribution by Class</h3>
            <p className="text-xs text-slate-500 mt-0.5">Active enrollment breakdown</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={classDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                >
                  {classDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
          <p className="text-xs text-slate-500 mt-0.5">Common tasks and shortcuts</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => router.push('/dashboard/attendance')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all duration-150"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                <ClipboardEdit className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">Mark Attendance</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/students')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all duration-150"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">Add Student</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/announcements')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all duration-150"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                <Megaphone className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">Announcement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
