'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ArrowUpRight, ArrowDownRight, Users, BookOpen, CreditCard, TrendingUp, ClipboardEdit, UserPlus, IndianRupee, Megaphone } from 'lucide-react'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const styles: Record<string, { bg: string; icon: string }> = {
            blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600' },
            green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600' },
            amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600' },
            purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600' },
          }
          const s = styles[stat.color]
          return (
            <Card key={stat.title} className={s.bg}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${s.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend (Weekly)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Class Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Student Distribution by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {classDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2"
              onClick={() => router.push('/dashboard/attendance')}
            >
              <ClipboardEdit className="h-6 w-6 text-slate-700" />
              <span className="text-sm">Mark Attendance</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2"
              onClick={() => router.push('/dashboard/students')}
            >
              <UserPlus className="h-6 w-6 text-slate-700" />
              <span className="text-sm">Add Student</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2"
              onClick={() => router.push('/dashboard/fees')}
            >
              <IndianRupee className="h-6 w-6 text-slate-700" />
              <span className="text-sm">Collect Fee</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2"
              onClick={() => router.push('/dashboard/announcements')}
            >
              <Megaphone className="h-6 w-6 text-slate-700" />
              <span className="text-sm">New Announcement</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
