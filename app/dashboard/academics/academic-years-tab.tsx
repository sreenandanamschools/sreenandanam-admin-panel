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
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">Current Academic Year: {activeYear.name}</p>
            <p className="text-sm text-emerald-600">
              {activeYear.start_date} → {activeYear.end_date}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Years</p>
          <p className="text-2xl font-bold text-slate-900">{years.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">Current Year</p>
          <p className="text-lg font-bold text-emerald-800 truncate">
            {activeYear?.name ?? '— None set —'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Latest Year</p>
          <p className="text-lg font-bold text-slate-900 truncate">
            {years[0]?.name ?? '—'}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">All Academic Years ({years.length})</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Loading academic years...</p>
            </div>
          </div>
        ) : years.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">No academic years yet</h3>
            <p className="text-sm text-slate-500 mb-4">Add one to get started.</p>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Academic Year
            </Button>
          </div>
        ) : (
          <div className="p-0">
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
                  <TableRow key={year.id} className={isCurrent ? 'bg-emerald-50/40' : ''}>
                    <TableCell className="font-semibold">{year.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{year.start_date}</TableCell>
                    <TableCell className="text-sm text-slate-500">{year.end_date}</TableCell>
                    <TableCell>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10">
                          <CheckCircle2 className="h-3 w-3" /> Current
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 ring-1 ring-slate-600/10">
                          Past/Future
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
      </div>

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
