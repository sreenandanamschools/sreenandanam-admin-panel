'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, Clock, AlertCircle, Save, Loader2, Search, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, CalendarRange } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Class, Student, Attendance } from '@/lib/supabase/types'
import { toast } from 'sonner'

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half-day'

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ElementType; activeClass: string; inactiveClass: string; shortcut: string }> = {
  Present:  { label: 'Present',  icon: CheckCircle,  activeClass: 'bg-green-600 text-white border-green-600',  inactiveClass: 'border-slate-200 text-slate-500 hover:border-green-400', shortcut: 'P' },
  Absent:   { label: 'Absent',   icon: XCircle,      activeClass: 'bg-red-600 text-white border-red-600',      inactiveClass: 'border-slate-200 text-slate-500 hover:border-red-400', shortcut: 'A' },
  Late:     { label: 'Late',     icon: Clock,        activeClass: 'bg-amber-500 text-white border-amber-500',  inactiveClass: 'border-slate-200 text-slate-500 hover:border-amber-400', shortcut: 'L' },
  'Half-day': { label: 'Half-day', icon: AlertCircle, activeClass: 'bg-blue-600 text-white border-blue-600',   inactiveClass: 'border-slate-200 text-slate-500 hover:border-blue-400', shortcut: 'H' },
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AttendancePage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [originalAttendance, setOriginalAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('attendance:date') || new Date().toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  })
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyMonth, setHistoryMonth] = useState(() => new Date().getMonth())
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear())
  const [historyData, setHistoryData] = useState<Record<string, Record<string, AttendanceStatus>>>({})

  const [modifiedRecords, setModifiedRecords] = useState<Set<string>>(new Set())

  // Bulk marking
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('Present')
  const [isBulkSaving, setIsBulkSaving] = useState(false)

  // Load classes on mount
  useEffect(() => {
    async function loadClasses() {
      const { data } = await supabase.from('classes').select('*').order('class_name')
      setClasses(data || [])
      setIsLoadingClasses(false)
      // Restore last selected class so reloads don't lose context
      const saved = typeof window !== 'undefined' ? localStorage.getItem('attendance:classId') : null
      if (saved && (data || []).some(c => c.id === saved)) {
        setSelectedClassId(saved)
      }
    }
    loadClasses()
  }, [])

  // Persist class/date selection so it survives reloads
  useEffect(() => {
    if (selectedClassId) localStorage.setItem('attendance:classId', selectedClassId)
  }, [selectedClassId])

  useEffect(() => {
    localStorage.setItem('attendance:date', selectedDate)
  }, [selectedDate])

  // Load students + existing attendance when class/date changes
  const loadStudentsAndAttendance = useCallback(async () => {
    if (!selectedClassId) { setStudents([]); setAttendance({}); setRemarks({}); setOriginalAttendance({}); setModifiedRecords(new Set()); return }
    setIsLoadingStudents(true)
    setError(null)
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
        const { data: attData } = await supabase.rpc('get_class_attendance_by_date', {
          p_class_id: selectedClassId,
          p_date: selectedDate
        });
        attendanceData = attData || [];
      }

      setStudents(studentsList as Student[]);

      const map: Record<string, AttendanceStatus> = {}
      const remarksMap: Record<string, string> = {}
      attendanceData.forEach(a => {
        map[a.student_id] = a.status as AttendanceStatus
        if (a.remarks) remarksMap[a.student_id] = a.remarks
      })
      setAttendance(map)
      setRemarks(remarksMap)
      setOriginalAttendance({ ...map })
      setModifiedRecords(new Set())
      setSelectedStudentId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoadingStudents(false)
    }
  }, [selectedClassId, selectedDate, supabase])

  useEffect(() => { loadStudentsAndAttendance() }, [loadStudentsAndAttendance])

  // Realtime: live-update attendance when rows change for this class+date
  useEffect(() => {
    if (!selectedClassId || students.length === 0) return

    const studentIds = students.map(s => s.id)
    const channel = supabase
      .channel(`attendance:${selectedClassId}:${selectedDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `date=eq.${selectedDate}`,
        },
        (payload: any) => {
          const row = payload.new as Attendance | undefined
          const oldRow = payload.old as Attendance | undefined
          const affected = (row ?? oldRow)
          if (!affected || !studentIds.includes(affected.student_id)) return

          if (payload.eventType === 'DELETE') {
            setAttendance(prev => {
              const next = { ...prev }
              delete next[affected.student_id]
              return next
            })
            setRemarks(prev => {
              const next = { ...prev }
              delete next[affected.student_id]
              return next
            })
            setOriginalAttendance(prev => {
              const next = { ...prev }
              delete next[affected.student_id]
              return next
            })
            setModifiedRecords(m => { const n = new Set(m); n.delete(affected.student_id); return n })
            return
          }

          if (!row) return
          setAttendance(prev => ({ ...prev, [row.student_id]: row.status }))
          setOriginalAttendance(prev => ({ ...prev, [row.student_id]: row.status }))
          setRemarks(prev => {
            const next = { ...prev }
            if (row.remarks) next[row.student_id] = row.remarks
            else delete next[row.student_id]
            return next
          })
          // A record that arrived from another session is not a local unsaved change
          setModifiedRecords(m => { const n = new Set(m); n.delete(row.student_id); return n })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedClassId, selectedDate, students, supabase])

  const toggleStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      const next = { ...prev, [studentId]: status }
      if (next[studentId] === originalAttendance[studentId]) {
        setModifiedRecords(m => { const n = new Set(m); n.delete(studentId); return n })
      } else {
        setModifiedRecords(m => { const n = new Set(m); n.add(studentId); return n })
      }
      return next
    })
  }

  const updateRemarks = (studentId: string, value: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: value }))
    setModifiedRecords(m => { const n = new Set(m); n.add(studentId); return n })
  }

  const setAllStatus = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {}
    const changed = new Set<string>()
    students.forEach(s => {
      all[s.id] = status
      if (status !== originalAttendance[s.id]) changed.add(s.id)
    })
    setAttendance(all)
    setModifiedRecords(changed)
  }

  const handleSave = async () => {
    if (!selectedClassId || students.length === 0) return

    const recordsToSave = students
      .filter(s => modifiedRecords.has(s.id))
      .map(s => ({
        student_id: s.id,
        date: selectedDate,
        status: attendance[s.id] || 'Absent',
        remarks: remarks[s.id] || null,
      }))

    if (recordsToSave.length === 0) {
      toast.info('No changes to save')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToSave, { onConflict: 'student_id,date' })
      if (error) throw error
      toast.success(`Attendance saved for ${recordsToSave.length} student${recordsToSave.length > 1 ? 's' : ''}`)
      setOriginalAttendance({ ...attendance })
      setModifiedRecords(new Set())
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save attendance')
    } finally {
      setIsSaving(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'SELECT') return

      const key = e.key.toUpperCase()
      if (['P', 'A', 'L', 'H'].includes(key) && selectedStudentId) {
        e.preventDefault()
        const statusMap: Record<string, AttendanceStatus> = { P: 'Present', A: 'Absent', L: 'Late', H: 'Half-day' }
        toggleStatus(selectedStudentId, statusMap[key])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedStudentId])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const counts = {
    Present: Object.values(attendance).filter(s => s === 'Present').length,
    Absent: Object.values(attendance).filter(s => s === 'Absent').length,
    Late: Object.values(attendance).filter(s => s === 'Late').length,
    'Half-day': Object.values(attendance).filter(s => s === 'Half-day').length,
  }
  const marked = Object.keys(attendance).length
  const unmarked = students.length - marked
  const hasChanges = modifiedRecords.size > 0

  const selectedClass = classes.find(c => c.id === selectedClassId)

  // History modal
  const openHistory = async () => {
    if (!selectedClassId) return
    setHistoryOpen(true)
    await loadHistoryData()
  }

  const loadHistoryData = useCallback(async () => {
    if (!selectedClassId) return

    const daysInMonth = new Date(historyYear, historyMonth + 1, 0).getDate()
    const startDate = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}-01`
    const endDate = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}-${daysInMonth}`

    const studentIds = students.map(s => s.id)
    if (studentIds.length === 0) return

    const { data } = await supabase
      .from('attendance')
      .select('student_id, date, status')
      .in('student_id', studentIds)
      .gte('date', startDate)
      .lte('date', endDate)

    const grouped: Record<string, Record<string, AttendanceStatus>> = {}
    students.forEach(s => { grouped[s.id] = {} })
    ;(data || []).forEach((a: any) => {
      if (!grouped[a.student_id]) grouped[a.student_id] = {}
      grouped[a.student_id][a.date] = a.status as AttendanceStatus
    })
    setHistoryData(grouped)
  }, [selectedClassId, historyYear, historyMonth, students])

  useEffect(() => {
    if (historyOpen) loadHistoryData()
  }, [historyMonth, historyYear, historyOpen])

  const navigateMonth = (delta: number) => {
    const newMonth = historyMonth + delta
    if (newMonth < 0) { setHistoryMonth(11); setHistoryYear(y => y - 1) }
    else if (newMonth > 11) { setHistoryMonth(0); setHistoryYear(y => y + 1) }
    else setHistoryMonth(newMonth)
  }

  const daysInMonth = new Date(historyYear, historyMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(historyYear, historyMonth, 1).getDay()
  const historyDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-1">Mark and manage student attendance</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              disabled={isSaving || !selectedClassId || students.length === 0 || !hasChanges}
              variant={hasChanges ? 'default' : 'outline'}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {hasChanges ? `Save (${modifiedRecords.size})` : 'Saved'}
            </Button>
          </div>
          <div className="space-y-2 flex items-end">
            <Button
              variant="outline"
              className="w-full gap-2 h-9"
              onClick={openHistory}
              disabled={!selectedClassId || students.length === 0}
            >
              <CalendarDays className="h-4 w-4" />
              Month View
            </Button>
          </div>
          <div className="space-y-2 flex items-end">
            <Button
              variant="outline"
              className="w-full gap-2 h-9"
              onClick={() => setBulkDialogOpen(true)}
              disabled={!selectedClassId || students.length === 0}
            >
              <CalendarRange className="h-4 w-4" />
              Bulk Mark
            </Button>
          </div>
        </div>
      </div>

      {/* Mark Attendance */}
      {selectedClassId && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedClass ? (selectedClass.section ? `${selectedClass.class_name} ${selectedClass.section}` : selectedClass.class_name) : ''}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDate} &middot; {marked}/{students.length} marked
                  {unmarked > 0 && <span className="text-amber-600 font-medium"> &middot; {unmarked} unmarked</span>}
                  {hasChanges && <span className="text-blue-600 font-medium"> &middot; {modifiedRecords.size} unsaved</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-8 w-48 rounded-lg border border-slate-200 bg-transparent pl-8 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => setAllStatus('Present')} className="text-xs h-8">
                  <CheckCircle className="h-3 w-3 mr-1" /> All Present
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAllStatus('Absent')} className="text-xs h-8">
                  <XCircle className="h-3 w-3 mr-1" /> All Absent
                </Button>
              </div>
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
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">No students match your search.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Admission No.</TableHead>
                        <TableHead className="min-w-[300px]">Status</TableHead>
                        <TableHead className="min-w-[150px]">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((student, idx) => {
                        const current = attendance[student.id]
                        const isUnmarked = !(student.id in attendance)
                        const isSelected = selectedStudentId === student.id
                        const isModified = modifiedRecords.has(student.id)
                        return (
                          <TableRow
                            key={student.id}
                            className={`cursor-pointer ${
                              isSelected ? 'ring-2 ring-inset ring-slate-900/10 bg-slate-50' : ''
                            } ${
                              current === 'Present' ? 'bg-emerald-50/30' :
                              current === 'Absent' ? 'bg-red-50/30' :
                              current === 'Late' ? 'bg-amber-50/30' :
                              current === 'Half-day' ? 'bg-blue-50/30' :
                              isUnmarked ? 'bg-slate-50/50' : ''
                            }`}
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <TableCell className="text-slate-400 text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {student.full_name}
                                {isModified && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                              </div>
                            </TableCell>
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
                                      onClick={(e) => { e.stopPropagation(); toggleStatus(student.id, status) }}
                                      title={`${cfg.label} (${cfg.shortcut})`}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                        isActive ? cfg.activeClass : isUnmarked ? 'border-dashed border-slate-300 text-slate-400 hover:border-solid' : cfg.inactiveClass
                                      }`}
                                    >
                                      <Icon className="h-3 w-3" />
                                      <span className="hidden sm:inline">{cfg.label}</span>
                                      <span className="text-[10px] text-slate-400 ml-0.5 hidden sm:inline">{cfg.shortcut}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3 text-slate-300 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Note..."
                                  value={remarks[student.id] || ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => updateRemarks(student.id, e.target.value)}
                                  className="h-7 w-full rounded border border-slate-200 bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="border-t border-slate-100 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                    <div className="text-center p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Unmarked</p>
                      <p className={`text-2xl font-bold ${unmarked > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{unmarked}</p>
                    </div>
                  </div>
                  {selectedStudentId && (
                    <div className="mt-3 text-center text-xs text-slate-400">
                      Selected: {students.find(s => s.id === selectedStudentId)?.full_name} &middot; Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">P</kbd> <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">A</kbd> <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">L</kbd> <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">H</kbd> to mark
                    </div>
                  )}
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

      {/* Bulk Mark Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Mark Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Mark all students in <strong>{selectedClass?.class_name}{selectedClass?.section ? ` ${selectedClass.section}` : ''}</strong> for a range of dates.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">From Date</Label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={e => setBulkStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">To Date</Label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={e => setBulkEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Status</Label>
              <div className="flex gap-2">
                {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(status => {
                  const cfg = STATUS_CONFIG[status]
                  const Icon = cfg.icon
                  const isActive = bulkStatus === status
                  return (
                    <button
                      key={status}
                      onClick={() => setBulkStatus(status)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        isActive ? cfg.activeClass : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!bulkStartDate || !bulkEndDate || !selectedClassId) return
                setIsBulkSaving(true)
                try {
                  const start = new Date(bulkStartDate)
                  const end = new Date(bulkEndDate)
                  const dates: string[] = []
                  const current = new Date(start)
                  while (current <= end) {
                    dates.push(current.toISOString().split('T')[0])
                    current.setDate(current.getDate() + 1)
                  }

                  const records = dates.flatMap(date =>
                    students.map(s => ({
                      student_id: s.id,
                      date,
                      status: bulkStatus,
                      remarks: null,
                    }))
                  )

                  const { error } = await supabase
                    .from('attendance')
                    .upsert(records, { onConflict: 'student_id,date' })
                  if (error) throw error

                  toast.success(`Marked ${bulkStatus} for ${students.length} students across ${dates.length} days`)
                  setBulkDialogOpen(false)
                  loadStudentsAndAttendance()
                } catch (e: any) {
                  toast.error(e.message)
                } finally {
                  setIsBulkSaving(false)
                }
              }}
              disabled={!bulkStartDate || !bulkEndDate || isBulkSaving}
            >
              {isBulkSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Apply Bulk Mark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Attendance History — {selectedClass?.class_name}{selectedClass?.section ? ` ${selectedClass.section}` : ''}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {MONTHS[historyMonth]} {historyYear}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateMonth(1)} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Student</TableHead>
                  {historyDays.map(day => {
                    const date = new Date(historyYear, historyMonth, day)
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                    const isToday = date.toDateString() === new Date().toDateString()
                    return (
                      <TableHead key={day} className={`text-center min-w-[32px] px-1 text-[10px] ${isToday ? 'bg-slate-100' : ''}`}>
                        <div>{day}</div>
                        <div className="text-[8px] text-slate-400">{dayName}</div>
                      </TableHead>
                    )
                  })}
                  <TableHead className="text-center min-w-[60px] text-[10px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => {
                  const studentHistory = historyData[student.id] || {}
                  let presentCount = 0
                  const daysWithData = Object.keys(studentHistory).length
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 bg-white z-10 font-medium text-xs min-w-[150px]">{student.full_name}</TableCell>
                      {historyDays.map(day => {
                        const dateStr = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const status = studentHistory[dateStr]
                        const isToday = new Date(dateStr).toDateString() === new Date().toDateString()
                        if (status === 'Present') { presentCount++ }
                        return (
                          <TableCell key={day} className={`text-center p-0 ${isToday ? 'bg-slate-50' : ''}`}>
                            <div className={`h-7 w-full flex items-center justify-center text-[10px] font-medium ${
                              status === 'Present' ? 'text-green-700 bg-green-50' :
                              status === 'Absent' ? 'text-red-700 bg-red-50' :
                              status === 'Late' ? 'text-amber-700 bg-amber-50' :
                              status === 'Half-day' ? 'text-blue-700 bg-blue-50' :
                              'text-slate-200'
                            }`}>
                              {status === 'Present' ? 'P' :
                               status === 'Absent' ? 'A' :
                               status === 'Late' ? 'L' :
                               status === 'Half-day' ? 'H' : '-'}
                            </div>
                          </TableCell>
                        )
                      })}
                      <TableCell className={`text-center text-xs font-bold ${
                        daysWithData > 0 && (presentCount / daysWithData) >= 0.75 ? 'text-green-600' :
                        daysWithData > 0 && (presentCount / daysWithData) >= 0.5 ? 'text-amber-600' :
                        daysWithData > 0 ? 'text-red-600' : 'text-slate-300'
                      }`}>
                        {daysWithData > 0 ? Math.round((presentCount / daysWithData) * 100) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
