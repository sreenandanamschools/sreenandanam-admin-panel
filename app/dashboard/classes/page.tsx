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
import { Edit2, Trash2, Plus, Loader2, School } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Class } from '@/lib/supabase/types'

interface ClassWithCount extends Class {
  student_count?: number
}

const EMPTY_FORM = { class_name: '', section: '' }

export default function ClassesPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassWithCount[]>([])
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
      const { data: classesData, error: cErr } = await supabase
        .from('classes')
        .select('*')
        .order('class_name')
      if (cErr) throw cErr

      // Count students per class
      const { data: counts } = await supabase
        .from('students')
        .select('class_id')
        .eq('is_active', true)

      const countMap: Record<string, number> = {}
      counts?.forEach(s => {
        if (s.class_id) countMap[s.class_id] = (countMap[s.class_id] || 0) + 1
      })

      setClasses((classesData || []).map(c => ({ ...c, student_count: countMap[c.id] || 0 })))
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
    setForm({ class_name: c.class_name, section: c.section || '' })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.class_name.trim()) return
    setIsSaving(true); setError(null)
    try {
      const payload = { class_name: form.class_name.trim(), section: form.section.trim() || null }
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

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-600">Total Classes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{classes.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-600">Active Students</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalStudents.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-600">Avg Class Size</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{avgSize}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Classes ({classes.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12">
              <School className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No classes yet. Add your first class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Section</TableHead>
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
                        <TableCell>{cls.section || '—'}</TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, count * 2)}%` }} />
                            </div>
                            <span className="text-sm text-slate-600">{count} students</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
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
        </CardContent>
      </Card>

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
