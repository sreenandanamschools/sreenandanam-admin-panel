'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Trash2, Loader2, Briefcase, ExternalLink, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Career } from '@/lib/supabase/types'

export default function CareersPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Career[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewItem, setViewItem] = useState<Career | null>(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data, error } = await supabase.from('careers').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (e: any) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('careers').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false); setDeleteId(null); await fetchAll()
    } catch (e: any) { setError(e.message) }
    finally { setIsDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Career Applications</h1>
        <p className="text-slate-600 mt-1">View job applications submitted through the website</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle>All Applications ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No applications received yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Resume</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewItem(c)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{c.email}</TableCell>
                      <TableCell className="text-sm text-slate-600">{c.phone}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <a href={c.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={e => { e.stopPropagation(); setDeleteId(c.id); setDeleteDialogOpen(true) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{viewItem.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <a href={`mailto:${viewItem.email}`} className="font-medium text-blue-600 flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{viewItem.email}</a>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <a href={`tel:${viewItem.phone}`} className="font-medium text-blue-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{viewItem.phone}</a>
                </div>
              </div>
              {viewItem.cover_letter && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Cover Letter</p>
                  <p className="text-slate-700 whitespace-pre-wrap text-sm bg-slate-50 p-3 rounded-lg">{viewItem.cover_letter}</p>
                </div>
              )}
              <div>
                <a href={viewItem.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  <ExternalLink className="h-4 w-4" /> Open Resume
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Application</DialogTitle></DialogHeader>
          <p className="text-slate-600">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
