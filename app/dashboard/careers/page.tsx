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
import { Trash2, Loader2, Briefcase, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Career } from '@/lib/supabase/types'
import { toast } from 'sonner'

export default function CareersPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Career[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
      toast.success("Application deleted")
    } catch (e: any) { setError(e.message) }
    finally { setIsDeleting(false) }
  }

  const openResume = async (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      // Legacy check: if it's already a full URL, open directly
      if (path.startsWith('http://') || path.startsWith('https://')) {
        window.open(path, '_blank')
        return
      }

      // Generate a signed URL valid for 60 seconds
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(path, 60)

      if (error) throw error
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err: any) {
      toast.error('Failed to open resume: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Career Applications</h1>
        <p className="text-slate-600 mt-1">View job applications submitted through the website</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">All Applications ({items.length})</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Loading applications...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
              <Briefcase className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">No applications yet</h3>
            <p className="text-sm text-slate-500">Applications submitted through the website will appear here.</p>
          </div>
        ) : (
          <div className="p-0">
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
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{c.email}</TableCell>
                    <TableCell className="text-sm text-slate-500">{c.phone}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <button onClick={e => openResume(c.resume_url, e)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600" onClick={() => { setDeleteId(c.id); setDeleteDialogOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
