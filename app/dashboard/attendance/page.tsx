'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CheckCircle, XCircle, Clock, AlertCircle, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Class, Student, Attendance } from '@/lib/supabase/types'

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half-day'

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ElementType; activeClass: string; inactiveClass: string }> = {
  Present:  { label: 'Present',  icon: CheckCircle,  activeClass: 'bg-green-600 text-white border-green-600',  inactiveClass: 'border-slate-200 text-slate-500 hover:border-green-400' },
  Absent:   { label: 'Absent',   icon: XCircle,      activeClass: 'bg-red-600 text-white border-red-600',      inactiveClass: 'border-slate-200 text-slate-500 hover:border-red-400' },
  Late:     { label: 'Late',     icon: Clock,        activeClass: 'bg-amber-500 text-white border-amber-500',  inactiveClass: 'border-slate-200 text-slate-500 hover:border-amber-400' },
  'Half-day': { label: 'Half-day', icon: AlertCircle, activeClass: 'bg-blue-600 text-white border-blue-600',   inactiveClass: 'border-slate-200 text-slate-500 hover:border-blue-400' },
}

export default function AttendancePage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load classes on mount
  useEffect(() => {
    async function loadClasses() {
      const { data } = await supabase.from('classes').select('*').order('class_name')
      setClasses(data || [])
      setIsLoadingClasses(false)
    }
    loadClasses()
  }, [])

  // Load students + existing attendance when class/date changes
  const loadStudentsAndAttendance = useCallback(async () => {
    if (!selectedClassId) { setStudents([]); setAttendance({}); return }
    setIsLoadingStudents(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const { data: enrollmentsData, error: eErr } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner (id, full_name, admission_no)
        `)
        .eq('class_id', selectedClassId)
        .eq('status', 'active');

      if (eErr) throw eErr;

      const studentsList = (enrollmentsData || []).map((e: any) => e.students).filter(Boolean);
      studentsList.sort((a, b) => a.full_name.localeCompare(b.full_name));
      const studentIds = studentsList.map(s => s.id);

      let attendanceData: any[] = [];
      if (studentIds.length > 0) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('student_id, status')
          .eq('date', selectedDate)
          .in('student_id', studentIds);
        attendanceData = attData || [];
      }

      setStudents(studentsList as Student[]);

      const map: Record<string, AttendanceStatus> = {}
      attendanceData.forEach(a => { map[a.student_id] = a.status as AttendanceStatus })
      setAttendance(map)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoadingStudents(false)
    }
  }, [selectedClassId, selectedDate, supabase])

  useEffect(() => { loadStudentsAndAttendance() }, [loadStudentsAndAttendance])

  const toggleStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
  }

  const handleSave = async () => {
    if (!selectedClassId || students.length === 0) return
    setIsSaving(true); setError(null)
    try {
      const records = students.map(s => ({
        student_id: s.id,
        date: selectedDate,
        status: attendance[s.id] || 'Absent',
        remarks: null,
      }))
      // Upsert: update if exists for that student+date, insert otherwise
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date' })
      if (error) throw error
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const counts = {
    Present: Object.values(attendance).filter(s => s === 'Present').length,
    Absent: Object.values(attendance).filter(s => s === 'Absent').length,
    Late: Object.values(attendance).filter(s => s === 'Late').length,
    'Half-day': Object.values(attendance).filter(s => s === 'Half-day').length,
  }
  const marked = Object.keys(attendance).length

  const selectedClass = classes.find(c => c.id === selectedClassId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-1">Mark and manage student attendance</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
      {saveSuccess && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-center gap-2">✓ Attendance saved successfully!</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Class</Label>
            {isLoadingClasses ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 h-9"><Loader2 className="h-4 w-4 animate-spin" /> Loading classes...</div>
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
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider" htmlFor="att-date">Date</Label>
            <input
              id="att-date"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2 flex items-end">
            <Button
              className="w-full gap-2 h-9"
              onClick={handleSave}
              disabled={isSaving || !selectedClassId || students.length === 0}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* Mark Attendance */}
      {selectedClassId && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedClass ? (selectedClass.section ? `${selectedClass.class_name} ${selectedClass.section}` : selectedClass.class_name) : ''}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedDate} &middot; {marked}/{students.length} marked</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                const all: Record<string, AttendanceStatus> = {}
                students.forEach(s => { all[s.id] = 'Present' })
                setAttendance(all)
              }}>Mark All Present</Button>
            </div>
          </div>
          <div className="p-0">
            {isLoadingStudents ? (
              <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <p className="text-sm text-slate-400">Loading students...</p>
                </div>
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">No active students in this class.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, idx) => {
                      const current = attendance[student.id]
                      return (
                        <TableRow key={student.id} className={
                          current === 'Present' ? 'bg-emerald-50/30' :
                          current === 'Absent' ? 'bg-red-50/30' :
                          current === 'Late' ? 'bg-amber-50/30' :
                          current === 'Half-day' ? 'bg-blue-50/30' : ''
                        }>
                          <TableCell className="text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-500">{student.admission_no}</TableCell>
                          <TableCell>
                            <div className="flex gap-1.5 flex-wrap">
                              {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(status => {
                                const cfg = STATUS_CONFIG[status]
                                const Icon = cfg.icon
                                const isActive = current === status
                                return (
                                  <button
                                    key={status}
                                    onClick={() => toggleStatus(student.id, status)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                      isActive ? cfg.activeClass : cfg.inactiveClass
                                    }`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    <span className="hidden sm:inline">{cfg.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Summary */}
                <div className="border-t border-slate-100 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Object.keys(counts) as AttendanceStatus[]).map(status => (
                      <div key={status} className="text-center p-3 rounded-lg bg-slate-50">
                        <p className="text-xs text-slate-500 mb-1">{status}</p>
                        <p className={`text-2xl font-bold ${
                          status === 'Present' ? 'text-emerald-600' :
                          status === 'Absent' ? 'text-red-600' :
                          status === 'Late' ? 'text-amber-600' : 'text-blue-600'
                        }`}>{counts[status]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!selectedClassId && (
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
            <CheckCircle className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-sm font-medium text-slate-700">Select a class to mark attendance</h3>
          <p className="text-sm text-slate-500 mt-1">Choose a class and date from the filters above.</p>
        </div>
      )}
    </div>
  )
}
