'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, BookOpen, TrendingUp, ClipboardEdit, UserPlus, Megaphone, AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface ClassAttendanceSummary {
  classId: string
  className: string
  total: number
  present: number
  absent: number
  late: number
  halfDay: number
}

interface LowAttendanceStudent {
  id: string
  name: string
  admission_no: string
  percentage: number
  totalDays: number
  presentDays: number
}

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
  const [todayAttendance, setTodayAttendance] = useState<ClassAttendanceSummary[]>([])
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState<LowAttendanceStudent[]>([])
  const [todayDate] = useState(new Date().toISOString().split('T')[0])
  const [classes, setClasses] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true)

        const [{ data: cls }, { data: activeYear }] = await Promise.all([
          supabase.from('classes').select('*').order('class_name'),
          supabase.from('academic_years').select('id').eq('is_active', true).single()
        ])
        setClasses(cls || [])

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

        // 3. Attendance Stats (last 500)
        const { data: attendanceRecords } = await supabase
          .from('attendance')
          .select('date, status, student_id')
          .order('date', { ascending: false })
          .limit(500)

        let totalPresent = 0
        let totalRecords = 0
        const dailyAttendance: Record<string, { present: number, total: number }> = {}

        if (attendanceRecords) {
          totalRecords = attendanceRecords.length
          attendanceRecords.forEach(record => {
            if (record.status === 'Present') totalPresent++
            const dateStr = record.date
            if (!dailyAttendance[dateStr]) dailyAttendance[dateStr] = { present: 0, total: 0 }
            dailyAttendance[dateStr].total++
            if (record.status === 'Present') dailyAttendance[dateStr].present++
          })
        }

        const avgAtt = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0
        const formattedAttendanceData = Object.keys(dailyAttendance).sort().slice(-14).map(date => ({
          name: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          attendance: Math.round((dailyAttendance[date].present / dailyAttendance[date].total) * 100),
          present: dailyAttendance[date].present,
          total: dailyAttendance[date].total,
        }))

        // 4. Class Distribution (active year enrollments)
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

        // 5. Today's attendance by class
        const classAttendance: ClassAttendanceSummary[] = []
        if (cls && activeYear) {
          for (const c of cls) {
            const { data: enrollments } = await supabase
              .from('student_enrollments')
              .select('student_id')
              .eq('class_id', c.id)
              .eq('academic_year_id', activeYear.id)
              .eq('status', 'active')

            const studentIds = (enrollments || []).map((e: any) => e.student_id)
            if (studentIds.length === 0) continue

            const { data: attData } = await supabase
              .from('attendance')
              .select('status')
              .eq('date', todayDate)
              .in('student_id', studentIds)

            const markedCount = attData?.length || 0
            if (markedCount === 0) continue

            let present = 0, absent = 0, late = 0, halfDay = 0
            attData?.forEach((a: any) => {
              if (a.status === 'Present') present++
              else if (a.status === 'Absent') absent++
              else if (a.status === 'Late') late++
              else if (a.status === 'Half-day') halfDay++
            })

            classAttendance.push({
              classId: c.id,
              className: c.section ? `${c.class_name} ${c.section}` : c.class_name,
              total: markedCount,
              present, absent, late, halfDay,
            })
          }
        }
        setTodayAttendance(classAttendance)

        // 6. Low attendance students (<75% in last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const startDate = thirtyDaysAgo.toISOString().split('T')[0]

        const { data: allAttendance } = await supabase
          .from('attendance')
          .select('student_id, status, date')
          .gte('date', startDate)
          .lte('date', todayDate)

        if (allAttendance && allAttendance.length > 0) {
          const studentDayCount: Record<string, { present: number; total: number; name: string; admission_no: string }> = {}
          const studentIds = [...new Set(allAttendance.map(a => a.student_id))]

          // Get student names
          const { data: studentData } = await supabase
            .from('students')
            .select('id, full_name, admission_no')
            .in('id', studentIds)

          const studentMap: Record<string, { full_name: string; admission_no: string }> = {}
          studentData?.forEach((s: any) => { studentMap[s.id] = s })

          allAttendance.forEach((a: any) => {
            if (!studentDayCount[a.student_id]) {
              const studentInfo = studentMap[a.student_id] || { full_name: 'Unknown', admission_no: '-' }
              studentDayCount[a.student_id] = { present: 0, total: 0, name: studentInfo.full_name, admission_no: studentInfo.admission_no }
            }
            studentDayCount[a.student_id].total++
            if (a.status === 'Present') studentDayCount[a.student_id].present++
          })

          const lowAtt = Object.entries(studentDayCount)
            .map(([id, data]) => ({
              id,
              name: data.name,
              admission_no: data.admission_no,
              percentage: Math.round((data.present / data.total) * 100),
              totalDays: data.total,
              presentDays: data.present,
            }))
            .filter(s => s.percentage < 75 && s.totalDays >= 5)
            .sort((a, b) => a.percentage - b.percentage)
            .slice(0, 10)

          setLowAttendanceStudents(lowAtt)
        }

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

  const todayMarkedCount = todayAttendance.reduce((sum, c) => sum + c.total, 0)
  const todayPresentCount = todayAttendance.reduce((sum, c) => sum + c.present, 0)
  const todayAvg = todayMarkedCount > 0 ? Math.round((todayPresentCount / todayMarkedCount) * 100) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back! Here&apos;s your school overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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

        {/* Today's attendance mini card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Today&apos;s Attendance</span>
            <div className="p-2.5 rounded-xl ring-1 ring-amber-600/20 bg-amber-50 text-amber-600">
              <ClipboardEdit className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {todayAvg !== null ? `${todayAvg}%` : '—'}
          </div>
          {todayMarkedCount > 0 && (
            <p className="text-xs text-slate-500 mt-1">{todayPresentCount}/{todayMarkedCount} present in {todayAttendance.length} class{todayAttendance.length !== 1 ? 'es' : ''}</p>
          )}
        </div>
      </div>

      {/* Today's Attendance by Class */}
      {todayAttendance.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Today&apos;s Attendance by Class</h3>
              <p className="text-xs text-slate-500 mt-0.5">{todayDate}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/attendance')}>
              <ExternalLink className="h-3 w-3 mr-1" /> Mark More
            </Button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayAttendance.slice(0, 6).map(c => {
                const pct = Math.round((c.present / c.total) * 100)
                return (
                  <div key={c.classId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{c.className}</p>
                      <p className="text-xs text-slate-500">{c.present}/{c.total} present</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        pct >= 90 ? 'text-green-600' : pct >= 75 ? 'text-amber-600' : 'text-red-600'
                      }`}>{pct}%</span>
                      <div className="flex gap-0.5">
                        {c.absent > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700" title="Absent">
                            <XCircle className="h-2.5 w-2.5 inline" /> {c.absent}
                          </span>
                        )}
                        {c.late > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" title="Late">
                            <Clock className="h-2.5 w-2.5 inline" /> {c.late}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {todayAttendance.length > 6 && (
                <button
                  onClick={() => router.push('/dashboard/attendance')}
                  className="flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
                >
                  View all {todayAttendance.length} classes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Attendance Alert */}
      {lowAttendanceStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200">
          <div className="px-6 py-5 border-b border-amber-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Low Attendance Alert</h3>
              <p className="text-xs text-slate-500 mt-0.5">Students with &lt;75% attendance in the last 30 days</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowAttendanceStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.admission_no} &middot; {s.presentDays}/{s.totalDays} days</p>
                  </div>
                  <span className={`text-sm font-bold ${s.percentage < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                    {s.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance Trend */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Attendance Trend (Last 14 Days)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Daily attendance percentage</p>
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
            <button
              onClick={() => router.push('/dashboard/attendance')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all duration-150"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">Attendance Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
