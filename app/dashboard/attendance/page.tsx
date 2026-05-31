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

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saveSuccess && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">✓ Attendance saved successfully!</div>}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              {isLoadingClasses ? (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
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
              <Label htmlFor="att-date">Date</Label>
              <input
                id="att-date"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                className="w-full gap-2"
                onClick={handleSave}
                disabled={isSaving || !selectedClassId || students.length === 0}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Attendance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mark Attendance */}
      {selectedClassId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedClass ? (selectedClass.section ? `${selectedClass.class_name} ${selectedClass.section}` : selectedClass.class_name) : ''} — {selectedDate}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">{marked}/{students.length} marked</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  const all: Record<string, AttendanceStatus> = {}
                  students.forEach(s => { all[s.id] = 'Present' })
                  setAttendance(all)
                }}>Mark All Present</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : students.length === 0 ? (
              <p className="text-center py-12 text-slate-500">No active students in this class.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
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
                            current === 'Present' ? 'bg-green-50/50' :
                            current === 'Absent' ? 'bg-red-50/50' :
                            current === 'Late' ? 'bg-amber-50/50' :
                            current === 'Half-day' ? 'bg-blue-50/50' : ''
                          }>
                            <TableCell className="text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{student.full_name}</TableCell>
                            <TableCell className="font-mono text-sm">{student.admission_no}</TableCell>
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
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
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
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.keys(counts) as AttendanceStatus[]).map(status => (
                    <div key={status} className="text-center">
                      <p className="text-xs text-slate-500 mb-1">{status}</p>
                      <p className={`text-2xl font-bold ${
                        status === 'Present' ? 'text-green-600' :
                        status === 'Absent' ? 'text-red-600' :
                        status === 'Late' ? 'text-amber-600' : 'text-blue-600'
                      }`}>{counts[status]}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClassId && (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium">Select a class to mark attendance</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
