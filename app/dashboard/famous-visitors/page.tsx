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
import { Plus, Trash2, Edit2, Loader2, Star, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'
import type { FamousVisitor } from '@/lib/supabase/types'

export default function FamousVisitorsPage() {
  const supabase = createClient()
  
  const [visitors, setVisitors] = useState<FamousVisitor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVisitor, setEditingVisitor] = useState<FamousVisitor | null>(null)
  
  const [form, setForm] = useState({
    name: '',
    designation: '',
    description: '',
    visited_at: new Date().toISOString().split('T')[0],
    image_url: null as string | null
  })

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchVisitors = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('famous_visitors')
        .select('*')
        .order('visited_at', { ascending: false })
      
      if (error) throw error
      setVisitors(data || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchVisitors()
  }, [fetchVisitors])

  const openAddDialog = () => {
    setEditingVisitor(null)
    setForm({
      name: '',
      designation: '',
      description: '',
      visited_at: new Date().toISOString().split('T')[0],
      image_url: null
    })
    setDialogOpen(true)
  }

  const openEditDialog = (visitor: FamousVisitor) => {
    setEditingVisitor(visitor)
    setForm({
      name: visitor.name,
      designation: visitor.designation,
      description: visitor.description || '',
      visited_at: visitor.visited_at,
      image_url: visitor.image_url
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.designation || !form.visited_at) {
      return toast.error('Name, Designation, and Visit Date are required')
    }

    setIsSaving(true)
    try {
      if (editingVisitor) {
        const { error } = await supabase.from('famous_visitors').update({
          ...form,
          description: form.description || null
        }).eq('id', editingVisitor.id)
        if (error) throw error
        toast.success('Visitor updated successfully')
      } else {
        const { error } = await supabase.from('famous_visitors').insert({
          ...form,
          description: form.description || null
        })
        if (error) throw error
        toast.success('Visitor added successfully')
      }
      setDialogOpen(false)
      fetchVisitors()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('famous_visitors').delete().eq('id', deleteId)
      if (error) throw error
      toast.success('Visitor deleted')
      setDeleteDialogOpen(false)
      fetchVisitors()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Famous Visitors</h1>
          <p className="text-slate-600 mt-1">Manage prominent guests who visited the school</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Visitor
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : visitors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Star className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">No famous visitors have been added yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visitors.map((visitor) => (
            <Card key={visitor.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="aspect-video relative bg-slate-100 flex items-center justify-center">
                {visitor.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={visitor.image_url} alt={visitor.name} className="w-full h-full object-cover" />
                ) : (
                  <Star className="h-12 w-12 text-slate-300" />
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-white" onClick={() => openEditDialog(visitor)}>
                    <Edit2 className="h-4 w-4 text-slate-700" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => { setDeleteId(visitor.id); setDeleteDialogOpen(true) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{visitor.name}</h3>
                  <p className="text-sm font-medium text-blue-600 line-clamp-1">{visitor.designation}</p>
                </div>
                
                {visitor.description && (
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    "{visitor.description}"
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-4">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Visited on {new Date(visitor.visited_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingVisitor ? 'Edit Visitor' : 'Add Famous Visitor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="flex justify-center mb-6">
              <ImageUpload
                folder="visitors"
                shape="avatar"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                onRemove={() => setForm({ ...form, image_url: null })}
              />
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="e.g. Dr. A.P.J. Abdul Kalam"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input 
                  value={form.designation} 
                  onChange={e => setForm({...form, designation: e.target.value})} 
                  placeholder="e.g. Former President"
                />
              </div>
              <div className="space-y-2">
                <Label>Visit Date *</Label>
                <Input 
                  type="date"
                  value={form.visited_at} 
                  onChange={e => setForm({...form, visited_at: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description / Remarks</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                placeholder="A brief note about their visit..."
                rows={3}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingVisitor ? 'Save Changes' : 'Add Visitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
          <p className="text-slate-600">Are you sure you want to remove this visitor record? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
