'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Edit2, Trash2, Loader2, CalendarDays, MapPin, Clock, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SchoolEvent } from '@/lib/supabase/types'
import { ImageUpload } from '@/components/ui/image-upload'

const EMPTY_FORM = { title: '', event_date: '', event_time: '', location: '', description: '', image_url: '' }

export default function EventsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<SchoolEvent[]>([])
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
      const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (e: any) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true) }
  const openEdit = (ev: SchoolEvent) => {
    setEditingId(ev.id)
    setForm({ title: ev.title, event_date: ev.event_date, event_time: ev.event_time, location: ev.location, description: ev.description || '', image_url: ev.image_url || '' })
    setError(null); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.event_date || !form.event_time || !form.location.trim()) return
    setIsSaving(true); setError(null)
    try {
      const payload = { title: form.title.trim(), event_date: form.event_date, event_time: form.event_time, location: form.location.trim(), description: form.description.trim() || null, image_url: form.image_url.trim() || null }
      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('events').insert(payload)
        if (error) throw error
      }
      setDialogOpen(false); await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null); await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const isUpcoming = (date: string) => new Date(date) >= new Date(new Date().toDateString())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-600 mt-1">Schedule and manage school events</p>
        </div>
        <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Event</Button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">All Events ({items.length})</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Loading events...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">No events scheduled</h3>
            <p className="text-sm text-slate-500">Create an event to get started.</p>
          </div>
        ) : (
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(ev => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      {ev.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ev.image_url} alt={ev.title} className="w-9 h-9 rounded-lg object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80?text=No+Img' }} />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{ev.title}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{ev.event_time}</TableCell>
                    <TableCell className="text-sm text-slate-500">{ev.location}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        isUpcoming(ev.event_date) ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-600/10'
                      }`}>
                        {isUpcoming(ev.event_date) ? 'Upcoming' : 'Past'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(ev)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setDeleteId(ev.id); setDeleteDialogOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Event' : 'New Event'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Annual Day Celebration" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Date *</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Time *</Label><Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Location *</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="School Auditorium" /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="space-y-1">
              <Label>Image</Label>
              <div className="pt-2">
                <ImageUpload
                  folder="events"
                  shape="square"
                  value={form.image_url}
                  onChange={url => setForm(f => ({ ...f, image_url: url }))}
                  onRemove={() => setForm(f => ({ ...f, image_url: '' }))}
                />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingId ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Event</DialogTitle></DialogHeader>
          <p className="text-slate-600">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
