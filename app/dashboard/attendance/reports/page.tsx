'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Download, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Class, Attendance } from '@/lib/supabase/types'

interface StudentReport {
  id: string
  name: string
  admission_no: string
  totalDays: number
  present: number
  absent: number
  late: number
  halfDay: number
  percentage: number
}

export default function AttendanceReportsPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [report, setReport] = useState<StudentReport[]>([])
  const [classSummary, setClassSummary] = useState({ present: 0, absent: 0, late: 0, halfDay: 0, total: 0 })

  useEffect(() => {
    async function loadClasses() {
      const { data } = await supabase.from('classes').select('*').order('class_name')
      setClasses(data || [])
      setIsLoadingClasses(false)
    }
    loadClasses()
  }, [])

  const generateReport = useCallback(async () => {
    if (!selectedClassId) return
    setIsLoadingReport(true)
    try {
      const { data: enrollmentsData } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner (id, full_name, admission_no)
        `)
        .eq('class_id', selectedClassId)
        .eq('status', 'active')

      const studentsList = (enrollmentsData || []).map((e: any) => e.students).filter(Boolean)
      studentsList.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name))
      const studentIds = studentsList.map((s: any) => s.id)

      if (studentIds.length === 0) {
        setReport([])
        return
      }

      const daysInMonth = new Date(
        parseInt(selectedMonth.split('-')[0]),
        parseInt(selectedMonth.split('-')[1]),
        0
      ).getDate()
      const startDate = `${selectedMonth}-01`
      const endDate = `${selectedMonth}-${daysInMonth}`

      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .gte('date', startDate)
        .lte('date', endDate)
        .in('student_id', studentIds)

      const studentAttendance: Record<string, { present: number; absent: number; late: number; halfDay: number }> = {}
      studentIds.forEach((id: string) => {
        studentAttendance[id] = { present: 0, absent: 0, late: 0, halfDay: 0 }
      })

      ;(attData || []).forEach((a: any) => {
        if (!studentAttendance[a.student_id]) return
        if (a.status === 'Present') studentAttendance[a.student_id].present++
        else if (a.status === 'Absent') studentAttendance[a.student_id].absent++
        else if (a.status === 'Late') studentAttendance[a.student_id].late++
        else if (a.status === 'Half-day') studentAttendance[a.student_id].halfDay++
      })

      const reports: StudentReport[] = studentsList.map((s: any) => {
        const stats = studentAttendance[s.id] || { present: 0, absent: 0, late: 0, halfDay: 0 }
        const total = stats.present + stats.absent + stats.late + stats.halfDay
        return {
          id: s.id,
          name: s.full_name,
          admission_no: s.admission_no,
          totalDays: total,
          ...stats,
          percentage: total > 0 ? Math.round(((stats.present + stats.late * 0.5 + stats.halfDay * 0.5) / total) * 100) : 0,
        }
      })

      setReport(reports)

      const summary = { present: 0, absent: 0, late: 0, halfDay: 0, total: 0 }
      reports.forEach(r => {
        summary.present += r.present
        summary.absent += r.absent
        summary.late += r.late
        summary.halfDay += r.halfDay
        summary.total += r.totalDays
      })
      setClassSummary(summary)
    } catch (e: any) {
      console.error(e)
    } finally {
      setIsLoadingReport(false)
    }
  }, [selectedClassId, selectedMonth, supabase])

  const exportCSV = () => {
    if (report.length === 0) return

    const headers = ['Name', 'Admission No', 'Total Days', 'Present', 'Absent', 'Late', 'Half-day', 'Attendance %']
    const rows = report.map(r => [
      r.name,
      r.admission_no,
      r.totalDays.toString(),
      r.present.toString(),
      r.absent.toString(),
      r.late.toString(),
      r.halfDay.toString(),
      `${r.percentage}%`,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance Reports</h1>
        <p className="text-slate-600 mt-1">Monthly attendance summary and reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Class</Label>
            {isLoadingClasses ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 h-9"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : (
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.section ? `${c.class_name} ${c.section}` : c.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Month</Label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2 flex items-end">
            <Button className="w-full gap-2 h-9" onClick={generateReport} disabled={!selectedClassId || isLoadingReport}>
              {isLoadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Report
            </Button>
          </div>
          <div className="space-y-2 flex items-end">
            <Button variant="outline" className="w-full gap-2 h-9" onClick={exportCSV} disabled={report.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {report.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedClass?.section ? `${selectedClass.class_name} ${selectedClass.section}` : selectedClass?.class_name}
                </h3>
                <p className="text-xs text-slate-500">{monthLabel} &middot; {report.length} students</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-emerald-50">
                <p className="text-xs text-emerald-600 mb-1">Present</p>
                <p className="text-xl font-bold text-emerald-700">{classSummary.present}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-xs text-red-600 mb-1">Absent</p>
                <p className="text-xl font-bold text-red-700">{classSummary.absent}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50">
                <p className="text-xs text-amber-600 mb-1">Late</p>
                <p className="text-xl font-bold text-amber-700">{classSummary.late}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-600 mb-1">Half-day</p>
                <p className="text-xl font-bold text-blue-700">{classSummary.halfDay}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-violet-50">
                <p className="text-xs text-violet-600 mb-1">Avg Attendance</p>
                <p className="text-xl font-bold text-violet-700">
                  {classSummary.total > 0 ? `${Math.round(((classSummary.present + classSummary.late * 0.5 + classSummary.halfDay * 0.5) / classSummary.total) * 100)}%` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Student-wise Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Admission No</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Present</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Absent</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Late</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Half-day</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((student, idx) => (
                    <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{student.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{student.admission_no}</td>
                      <td className="px-4 py-3 text-center">{student.totalDays}</td>
                      <td className="px-4 py-3 text-center text-green-700 font-medium">{student.present}</td>
                      <td className="px-4 py-3 text-center text-red-700">{student.absent}</td>
                      <td className="px-4 py-3 text-center text-amber-700">{student.late}</td>
                      <td className="px-4 py-3 text-center text-blue-700">{student.halfDay}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                          student.percentage >= 75 ? 'bg-green-100 text-green-800' :
                          student.percentage >= 50 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {student.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {report.length === 0 && !isLoadingReport && selectedClassId && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-sm font-medium text-slate-700">No report generated yet</h3>
          <p className="text-sm text-slate-500 mt-1">Select a class and click Generate Report.</p>
        </div>
      )}

      {!selectedClassId && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-sm font-medium text-slate-700">Select a class to view reports</h3>
          <p className="text-sm text-slate-500 mt-1">Choose a class and month from the filters above.</p>
        </div>
      )}
    </div>
  )
}
