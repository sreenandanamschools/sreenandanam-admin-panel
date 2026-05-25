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
import { Plus, Edit2, Trash2, Loader2, CalendarDays, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AcademicYear } from '@/lib/supabase/types'

const EMPTY_FORM = {
  name: '',
  start_date: '',
  end_date: '',
}

export default function AcademicYearsTab() {
  const supabase = createClient()

  const [years, setYears] = useState<AcademicYear[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false })
      if (error) throw error
      setYears(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (y: AcademicYear) => {
    setEditingId(y.id)
    setForm({
      name: y.name,
      start_date: y.start_date,
      end_date: y.end_date,
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setForm(f => {
      const newForm = { ...f, [field]: value }
      if (newForm.start_date && newForm.end_date) {
        const startYear = new Date(newForm.start_date).getFullYear()
        const endYear = new Date(newForm.end_date).getFullYear()
        if (!isNaN(startYear) && !isNaN(endYear)) {
          newForm.name = `${startYear}-${endYear}`
        }
      }
      return newForm
    })
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.start_date || !form.end_date) return
    
    const sDate = new Date(form.start_date)
    const eDate = new Date(form.end_date)
    
    if (eDate <= sDate) {
      setError('End date must be strictly after the start date.')
      return
    }

    const hasOverlap = years.some(y => {
      if (editingId && y.id === editingId) return false
      const yStart = new Date(y.start_date)
      const yEnd = new Date(y.end_date)
      return sDate <= yEnd && yStart <= eDate
    })

    if (hasOverlap) {
      setError('These dates overlap with an existing academic year.')
      return
    }

    setIsSaving(true); setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
      }

      if (editingId) {
        const { error } = await supabase.from('academic_years').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('academic_years').insert(payload)
        if (error) throw error
      }

      setDialogOpen(false)
      await fetchAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('academic_years').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null)
      await fetchAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const activeYear = years.find(y => y.start_date <= today && y.end_date >= today)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Academic Sessions</h2>
          <p className="text-sm text-slate-500 mt-1">Manage academic sessions. Current year is auto-detected.</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Academic Year
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Active Year Banner */}
      {activeYear && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Current Academic Year: {activeYear.name}</p>
            <p className="text-sm text-green-700">
              {activeYear.start_date} → {activeYear.end_date}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Years</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{years.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Current Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-700 truncate">
              {activeYear?.name ?? '— None set —'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Latest Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">
              {years[0]?.name ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Academic Years ({years.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : years.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No academic years yet. Add one to get started.</p>
              <Button className="mt-4 gap-2" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Academic Year
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map(year => {
                    const isCurrent = year.start_date <= today && year.end_date >= today
                    return (
                    <TableRow key={year.id} className={isCurrent ? 'bg-green-50/60' : ''}>
                      <TableCell className="font-semibold">{year.name}</TableCell>
                      <TableCell>{year.start_date}</TableCell>
                      <TableCell>{year.end_date}</TableCell>
                      <TableCell>
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Current
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Past/Future
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(year)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => { setDeleteId(year.id); setDeleteDialogOpen(true) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Academic Year' : 'Add Academic Year'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ay_name">Year Name *</Label>
              <Input
                id="ay_name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. 2025-2026"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ay_start">Start Date *</Label>
              <Input
                id="ay_start"
                type="date"
                value={form.start_date}
                onChange={e => handleDateChange('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ay_end">End Date *</Label>
              <Input
                id="ay_end"
                type="date"
                value={form.end_date}
                onChange={e => handleDateChange('end_date', e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Save Changes' : 'Add Year'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Academic Year</DialogTitle></DialogHeader>
          <p className="text-slate-600">
            Deleting this year will remove it from all linked students and fee structures. Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
