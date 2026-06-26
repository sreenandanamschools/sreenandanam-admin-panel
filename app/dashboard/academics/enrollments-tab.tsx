'use client'

import { useEffect, useState, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { StudentEnrollment, AcademicYear, Class, Student } from '@/lib/supabase/types'

const EMPTY_FORM = {
  student_id: '',
  academic_year_id: '',
  class_id: '',
  roll_no: '',
  section: '',
  status: 'active',
  remarks: '',
}

export default function EnrollmentsTab() {
  const supabase = createClient()

  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  
  const [yearFilter, setYearFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [
        { data: enrollData, error: eErr },
        { data: studentData },
        { data: yearData },
        { data: classData }
      ] = await Promise.all([
        supabase
          .from('student_enrollments')
          .select('*, students(full_name, admission_no), academic_years(name), classes(class_name, section)')
          .order('created_at', { ascending: false }),
        supabase.from('students').select('*').order('full_name'),
        supabase.from('academic_years').select('*').order('start_date', { ascending: false }),
        supabase.from('classes').select('*').order('class_name'),
      ])

      if (eErr) throw eErr
      
      setEnrollments(enrollData || [])
      setStudents(studentData || [])
      
      const years = yearData || []
      setAcademicYears(years)
      if (years.length > 0 && yearFilter === 'all') {
        const activeYear = years.find((y: AcademicYear) => y.is_active)
        setYearFilter(activeYear ? activeYear.id : years[0].id)
      }
      
      setClasses(classData || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, yearFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      academic_year_id: yearFilter !== 'all' ? yearFilter : (academicYears[0]?.id || '')
    })
    setDialogOpen(true)
  }

  const openEdit = (e: StudentEnrollment) => {
    setEditingId(e.id)
    setForm({
      student_id: e.student_id,
      academic_year_id: e.academic_year_id,
      class_id: e.class_id,
      roll_no: e.roll_no || '',
      section: e.section || '',
      status: e.status,
      remarks: e.remarks || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.student_id || !form.academic_year_id || !form.class_id) return
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        student_id: form.student_id,
        academic_year_id: form.academic_year_id,
        class_id: form.class_id,
        roll_no: form.roll_no || null,
        section: form.section || null,
        status: form.status,
        remarks: form.remarks || null,
      }

      if (editingId) {
        const { error: updErr } = await supabase.from('student_enrollments').update(payload).eq('id', editingId)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase.from('student_enrollments').insert(payload)
        if (insErr) {
          if (insErr.code === '23505') throw new Error('Student is already enrolled in this academic year.')
          throw insErr
        }
      }
      setDialogOpen(false)
      await fetchAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = enrollments.filter(e => {
    const student = e.students as any
    const matchSearch = student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchYear = yearFilter === 'all' || e.academic_year_id === yearFilter
    const matchClass = classFilter === 'all' || e.class_id === classFilter
    return matchSearch && matchYear && matchClass
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Student Enrollments</h2>
          <p className="text-sm text-slate-500 mt-1">Manage yearly student academic enrollments</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> New Enrollment
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student name or admission no..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Academic Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.section ? `${c.class_name} ${c.section}` : c.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Enrollment Records ({filtered.length})</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Loading enrollments...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">No enrollment records found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => {
                  const student = e.students as any
                  const year = e.academic_years as any
                  const cls = e.classes as any
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{student?.full_name}</TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono">{student?.admission_no}</TableCell>
                      <TableCell className="text-sm">{year?.name}</TableCell>
                      <TableCell className="text-sm">{cls ? `${cls.class_name} ${cls.section || ''}` : '—'}</TableCell>
                      <TableCell className="text-sm">{e.roll_no || '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize
                          ${e.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10' :
                            e.status === 'promoted' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10' :
                            e.status === 'detained' ? 'bg-red-50 text-red-700 ring-1 ring-red-700/10' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-600/10'}`}
                        >
                          {e.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Enrollment' : 'New Enrollment'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })} disabled={!!editingId}>
                <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Academic Year *</Label>
                <Select value={form.academic_year_id} onValueChange={v => setForm({ ...form, academic_year_id: v })} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Class *</Label>
                <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.section ? `${c.class_name} ${c.section}` : c.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Roll No</Label>
                <Input value={form.roll_no} onChange={e => setForm({ ...form, roll_no: e.target.value })} placeholder="e.g. 12" />
              </div>
              <div className="grid gap-2">
                <Label>Section</Label>
                <Input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="promoted">Promoted</SelectItem>
                  <SelectItem value="detained">Detained</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
