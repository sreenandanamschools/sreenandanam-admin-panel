'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Search, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GalleryItem } from '@/lib/supabase/types'
import { ImageUpload } from '@/components/ui/image-upload'

const DEFAULT_CATEGORIES = ['Events', 'Sports', 'Academics', 'Cultural', 'Infrastructure', 'Other']

export default function GalleryPage() {
  const supabase = createClient()

  const [items, setItems] = useState<GalleryItem[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Events', image_url: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (e: any) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) return
    setIsSaving(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('gallery').insert({
        title: form.title.trim(),
        category: form.category,
        image_url: form.image_url.trim(),
        uploaded_by: user?.id || null,
      })
      if (error) throw error
      setDialogOpen(false)
      setForm({ title: '', category: 'Events', image_url: '' })
      await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('gallery').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null); await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsSaving(false) }
  }

  const existingCategories = [...new Set(items.map(item => item.category))]
  const allCategories = ['All', ...new Set([...DEFAULT_CATEGORIES, ...existingCategories])]
  const filtered = items.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter
    return matchSearch && matchCat
  })

  const categoryCount = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gallery</h1>
          <p className="text-slate-600 mt-1">School photos and media</p>
        </div>
        <Button className="gap-2" onClick={() => { setError(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Image
        </Button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {/* Search + Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by title…" className="pl-10" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat} {cat !== 'All' && categoryCount[cat] ? `(${categoryCount[cat]})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <p className="text-sm text-slate-400">Loading gallery...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
            <ImageIcon className="h-6 w-6 text-slate-300" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 mb-1">No images found</h3>
          <p className="text-sm text-slate-500">{search || categoryFilter !== 'All' ? 'No images match your filter.' : 'No images in the gallery yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="group relative rounded-lg overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              onClick={() => setSelectedItem(item)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full object-contain group-hover:scale-105 transition-transform duration-300 max-h-[80vh]"
                onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Image' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-white/70 text-xs">{item.category}</p>
                </div>
              </div>
              <button
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                onClick={e => { e.stopPropagation(); setDeleteId(item.id); setDeleteDialogOpen(true) }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Image Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Image to Gallery</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="img_title">Title *</Label>
              <Input id="img_title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Image title" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Events, Sports, or type a new one"
                list="category-suggestions" />
              <datalist id="category-suggestions">
                {existingCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Image Upload *</Label>
              <div className="pt-2">
                <ImageUpload 
                  folder="gallery"
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add to Gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Image</DialogTitle></DialogHeader>
          <p className="text-slate-600">Remove this image from the gallery?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedItem(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button className="absolute -top-10 right-0 text-white hover:text-slate-300 transition-colors"
              onClick={() => setSelectedItem(null)}>
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedItem.image_url} alt={selectedItem.title}
              className="w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="mt-2 text-center text-white">
              <p className="font-medium">{selectedItem.title}</p>
              <p className="text-white/60 text-sm">{selectedItem.category}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
