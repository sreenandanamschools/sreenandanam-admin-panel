'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Users, BookOpen, CreditCard, ClipboardCheck, Loader2, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface ReportData {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  totalBooks: number
  availableBooks: number
  totalPayments: number
  pendingInstallments: number
  attendanceByStatus: { name: string; value: number }[]
  feesByMonth: { month: string; collected: number }[]
  studentsByClass: { name: string; value: number }[]
  examsBySubject: { name: string; count: number }[]
  booksAvailability: { name: string; value: number }[]
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ReportsPage() {
  const supabase = createClient()
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReports() {
      setIsLoading(true); setError(null)
      try {
        const [
          { count: totalStudents },
          { count: activeStudents },
          { count: totalTeachers },
          { data: books },
          { data: payments },
          { data: pendingInstall },
          { data: attendanceRecords },
          { data: studentsWithClasses },
          { data: exams },
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('books').select('total_copies, available_copies, status'),
          supabase.from('payments').select('amount_paid, paid_at'),
          supabase.from('fee_installments').select('amount').eq('status', 'pending'),
          supabase.from('attendance').select('status').limit(2000),
          supabase.from('students').select('class_id, classes(class_name, section)').eq('is_active', true),
          supabase.from('exams').select('subject'),
        ])

        // Attendance by status
        const attCount: Record<string, number> = { Present: 0, Absent: 0, Late: 0, 'Half-day': 0 }
        attendanceRecords?.forEach(a => { attCount[a.status] = (attCount[a.status] || 0) + 1 })
        const attendanceByStatus = Object.entries(attCount).map(([name, value]) => ({ name, value }))

        // Fees by month
        const monthMap: Record<string, number> = {}
        payments?.forEach(p => {
          const month = MONTHS[new Date(p.paid_at).getMonth()]
          monthMap[month] = (monthMap[month] || 0) + Number(p.amount_paid || 0)
        })
        const feesByMonth = MONTHS.filter(m => monthMap[m]).map(m => ({ month: m, collected: monthMap[m] }))

        // Students by class
        const classMap: Record<string, number> = {}
        studentsWithClasses?.forEach(s => {
          if (s.classes) {
            const c = s.classes as any
            const name = c.section ? `${c.class_name} ${c.section}` : c.class_name
            classMap[name] = (classMap[name] || 0) + 1
          }
        })
        const studentsByClass = Object.entries(classMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)

        // Exams by subject
        const subjectMap: Record<string, number> = {}
        exams?.forEach(e => { subjectMap[e.subject] = (subjectMap[e.subject] || 0) + 1 })
        const examsBySubject = Object.entries(subjectMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)

        // Books
        const totalBooksNum = books?.length || 0
        const availBooksNum = books?.filter(b => b.status === 'Available').length || 0
        const booksAvailability = [
          { name: 'Available', value: availBooksNum },
          { name: 'Out of Stock', value: totalBooksNum - availBooksNum },
        ]

        const totalPaymentsNum = (payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0)
        const pendingAmt = (pendingInstall || []).reduce((s, i) => s + Number(i.amount || 0), 0)

        setData({
          totalStudents: totalStudents || 0,
          activeStudents: activeStudents || 0,
          totalTeachers: totalTeachers || 0,
          totalBooks: totalBooksNum,
          availableBooks: availBooksNum,
          totalPayments: totalPaymentsNum,
          pendingInstallments: pendingAmt,
          attendanceByStatus,
          feesByMonth,
          studentsByClass,
          examsBySubject,
          booksAvailability,
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
    { title: 'Fees Collected', value: `₹${(data.totalPayments / 100000).toFixed(2)}L`, sub: `₹${(data.pendingInstallments / 1000).toFixed(0)}k pending`, icon: CreditCard, color: 'amber' },
    { title: 'Library Books', value: data.totalBooks.toLocaleString(), sub: `${data.availableBooks} available`, icon: ClipboardCheck, color: 'purple' },
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection by Month */}
        <Card>
          <CardHeader><CardTitle>Fee Collection by Month</CardTitle></CardHeader>
          <CardContent>
            {data.feesByMonth.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No payment data yet</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.feesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
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

      {/* Charts Row 2 */}
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

        {/* Exams by Subject */}
        <Card>
          <CardHeader><CardTitle>Exams by Subject</CardTitle></CardHeader>
          <CardContent>
            {data.examsBySubject.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                <p className="text-sm">No exam data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.examsBySubject}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Exams" radius={[4, 4, 0, 0]}>
                    {data.examsBySubject.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Books Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Library Availability</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.booksAvailability} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fee Summary */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Fee Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Collected</p>
                  <p className="text-2xl font-bold text-green-700">₹{data.totalPayments.toLocaleString()}</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending Installments</p>
                  <p className="text-2xl font-bold text-red-700">₹{data.pendingInstallments.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-400" />
              </div>
              {data.totalPayments + data.pendingInstallments > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Collection Rate</span>
                    <span className="font-semibold">
                      {((data.totalPayments / (data.totalPayments + data.pendingInstallments)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(data.totalPayments / (data.totalPayments + data.pendingInstallments)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
