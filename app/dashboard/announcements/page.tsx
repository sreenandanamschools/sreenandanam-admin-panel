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
import { Plus, Edit2, Trash2, Megaphone, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Announcement } from '@/lib/supabase/types'

const EMPTY_FORM = { title: '', content: '' }

export default function AnnouncementsPage() {
  const supabase = createClient()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
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
        .from('announcements')
        .select('*')
        .order('published_date', { ascending: false })
      if (error) throw error
      setAnnouncements(data || [])
    } catch (e: any) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true) }
  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({ title: a.title, content: a.content })
    setError(null); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setIsSaving(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        target_audience: 'All',
        published_date: new Date().toISOString(),
        created_by: user?.id || null,
      }

      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('announcements').insert(payload)
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
      const { error } = await supabase.from('announcements').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null); await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-600 mt-1">Post school announcements</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">No announcements yet. Create the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400">
                        Published: {new Date(a.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                      onClick={() => { setDeleteId(a.id); setDeleteDialogOpen(true) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{a.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="E.g., Tomorrow is a holiday" />
            </div>
            <div className="space-y-1">
              <Label>Content *</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Announcement details…" rows={5} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Announcement</DialogTitle></DialogHeader>
          <p className="text-slate-600">Are you sure you want to delete this announcement? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
