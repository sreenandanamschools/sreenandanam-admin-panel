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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Edit2, Trash2, Loader2, Newspaper, Pin, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { News } from '@/lib/supabase/types'

const CATEGORIES = ['Admissions', 'Events', 'Notice', 'Announcement'] as const
const EMPTY_FORM = { title: '', category: 'Notice' as string, excerpt: '', is_new: true, is_pinned: false }

export default function NewsPage() {
  const supabase = createClient()

  const [items, setItems] = useState<News[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (e: any) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true) }
  const openEdit = (n: News) => {
    setEditingId(n.id)
    setForm({ title: n.title, category: n.category, excerpt: n.excerpt, is_new: n.is_new, is_pinned: n.is_pinned })
    setError(null); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim()) return
    setIsSaving(true); setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        excerpt: form.excerpt.trim(),
        is_new: form.is_new,
        is_pinned: form.is_pinned,
        published_at: new Date().toISOString().split('T')[0],
      }
      if (editingId) {
        const { error } = await supabase.from('news').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('news').insert(payload)
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
      const { error } = await supabase.from('news').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null); await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const filtered = items.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = categoryFilter === 'all' || n.category === categoryFilter
    return matchSearch && matchCategory
  })

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      Admissions: 'bg-green-100 text-green-800',
      Events: 'bg-blue-100 text-blue-800',
      Notice: 'bg-yellow-100 text-yellow-800',
      Announcement: 'bg-purple-100 text-purple-800',
    }
    return colors[cat] || 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">News</h1>
          <p className="text-slate-600 mt-1">Manage news items displayed on the school website</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add News
        </Button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search news…" className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>All News ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Newspaper className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No news items found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(n => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium max-w-xs truncate">{n.title}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryBadge(n.category)}`}>{n.category}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(n.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {n.is_new && <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">New</span>}
                          {n.is_pinned && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 font-medium"><Pin className="h-3 w-3" /> Pinned</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(n)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { setDeleteId(n.id); setDeleteDialogOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingId ? 'Edit News' : 'New News Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="News headline" />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Excerpt / Summary *</Label>
              <Textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Brief description…" rows={3} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_new} onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))} className="rounded" />
                Mark as New
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                Pin to Top
              </label>
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
          <DialogHeader><DialogTitle>Delete News Item</DialogTitle></DialogHeader>
          <p className="text-slate-600">Are you sure you want to delete this news item? This cannot be undone.</p>
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
