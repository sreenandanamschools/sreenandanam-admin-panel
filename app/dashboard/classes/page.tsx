'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Edit2, Trash2, Plus, Loader2, School } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Class, AcademicYear, Teacher } from '@/lib/supabase/types'

interface ClassWithCount extends Class {
  student_count?: number
}

const EMPTY_FORM = { class_name: '', section: '', academic_year_id: '', class_teacher_id: '' }

export default function ClassesPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassWithCount[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [
        { data: classesData, error: cErr },
        { data: enrollments },
        { data: yearsData },
        { data: teachersData },
      ] = await Promise.all([
        supabase
          .from('classes')
          .select('*, academic_years(name), teachers(first_name, last_name)')
          .order('class_name'),
        supabase
          .from('student_enrollments')
          .select('class_id')
          .eq('status', 'active'),
        supabase
          .from('academic_years')
          .select('*')
          .order('name'),
        supabase
          .from('teachers')
          .select('*')
          .order('first_name'),
      ])
      if (cErr) throw cErr

      const countMap: Record<string, number> = {}
      enrollments?.forEach(e => {
        if (e.class_id) countMap[e.class_id] = (countMap[e.class_id] || 0) + 1
      })

      setClasses((classesData || []).map(c => ({ ...c, student_count: countMap[c.id] || 0 })))
      setAcademicYears(yearsData || [])
      setTeachers(teachersData || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true) }
  const openEdit = (c: Class) => {
    setEditingId(c.id)
    setForm({
      class_name: c.class_name,
      section: c.section || '',
      academic_year_id: c.academic_year_id || '',
      class_teacher_id: c.class_teacher_id || '',
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.class_name.trim()) return
    setIsSaving(true); setError(null)
    try {
      const payload = {
        class_name: form.class_name.trim(),
        section: form.section.trim() || null,
        academic_year_id: form.academic_year_id || null,
        class_teacher_id: form.class_teacher_id || null,
      }
      if (editingId) {
        const { error } = await supabase.from('classes').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('classes').insert(payload)
        if (error) throw error
      }
      setDialogOpen(false)
      await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('classes').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null)
      await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const totalStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0)
  const avgSize = classes.length > 0 ? (totalStudents / classes.length).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Classes</h1>
          <p className="text-slate-600 mt-1">Manage school classes and sections</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Class
        </Button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Classes</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{classes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Active Students</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{totalStudents.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Avg Class Size</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{avgSize}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">All Classes ({classes.length})</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Loading classes...</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
              <School className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">No classes yet</h3>
            <p className="text-sm text-slate-500">Add your first class to get started.</p>
          </div>
        ) : (
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(cls => {
                  const count = cls.student_count || 0
                  return (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.class_name}</TableCell>
                      <TableCell className="text-slate-500">{cls.section || '—'}</TableCell>
                      <TableCell className="text-slate-500">{cls.academic_years?.name || '—'}</TableCell>
                      <TableCell className="text-slate-500">
                        {cls.teachers ? `${cls.teachers.first_name} ${cls.teachers.last_name || ''}` : '—'}
                      </TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-900 rounded-full" style={{ width: `${Math.min(100, count * 2)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{count} students</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(cls)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-600"
                            onClick={() => { setDeleteId(cls.id); setDeleteDialogOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Class' : 'Add Class'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="class_name">Class Name *</Label>
              <Input id="class_name" value={form.class_name}
                onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="e.g. Class 10" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="section">Section</Label>
              <Input id="section" value={form.section}
                onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="e.g. A" />
            </div>
            <div className="space-y-1">
              <Label>Academic Year</Label>
              <Select
                value={form.academic_year_id || "none"}
                onValueChange={v => setForm(f => ({ ...f, academic_year_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {academicYears.map(ay => (
                    <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Class Teacher</Label>
              <Select
                value={form.class_teacher_id || "none"}
                onValueChange={v => setForm(f => ({ ...f, class_teacher_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select Class Teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{`${t.first_name} ${t.last_name || ''}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Save Changes' : 'Add Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Class</DialogTitle></DialogHeader>
          <p className="text-slate-600">Deleting this class will not delete enrolled students, but they will have no class assigned. Continue?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
