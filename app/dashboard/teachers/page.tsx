'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Edit2, Trash2, Plus, Search, Loader2, User, Upload, Link } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Teacher } from '@/lib/supabase/types'
import { CSVImportDialog, type ColumnDef } from '@/components/csv-import-dialog'
import { toast } from 'sonner'

const TEACHER_CSV_COLUMNS: ColumnDef[] = [
  { key: 'first_name', label: 'First Name', required: true, example: 'Priya' },
  { key: 'last_name', label: 'Last Name', required: true, example: 'Nair' },
  { key: 'email', label: 'Email', required: true, example: 'priya.nair@school.com' },
  { key: 'subject', label: 'Subject', required: true, example: 'Mathematics' },
  { key: 'phone', label: 'Phone', required: false, example: '9876543210' },
  { key: 'join_date', label: 'Join Date', required: false, example: '2024-06-01' },
  { key: 'date_of_birth', label: 'Date of Birth', required: false, example: '1990-03-20' },
  { key: 'gender', label: 'Gender', required: false, example: 'Female' },
  { key: 'address', label: 'Address', required: false, example: '45 Beach Road, Kochi' },
  { key: 'qualification', label: 'Qualification', required: false, example: 'M.Sc Mathematics' },
  { key: 'experience_years', label: 'Experience (Years)', required: false, example: '5' },
  { key: 'teacherid', label: 'Teacher ID', required: false, example: 'T00202601' },
]

export default function TeachersPage() {
  const supabase = createClient()
  const router = useRouter()

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('first_name')
      if (error) throw error
      setTeachers(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('teachers').delete().eq('id', deleteId)
      if (error) throw error
      setDeleteDialogOpen(false)
      setDeleteId(null)
      await fetchAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const copyQrLink = (teacher: Teacher) => {
    const baseUrl = "https://sreenandanam-school-website.vercel.app";
    // Use teacherid if available, fallback to id for the unique identifier in the link
    const idToUse = teacher.teacherid || teacher.id;
    const link = `${baseUrl}/s/id-card/teacher/${encodeURIComponent(idToUse)}`;
    navigator.clipboard.writeText(link);
    toast.success("Teacher QR Link copied!");
  };

  const filtered = teachers.filter(t => {
    const name = `${t.first_name} ${t.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  })

  // Summary stats
  const subjects = [...new Set(teachers.map(t => t.subject))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Teachers</h1>
          <p className="text-slate-600 mt-1">Manage teaching staff</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setCsvDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button className="gap-2" onClick={() => router.push('/dashboard/teachers/new')}>
            <Plus className="h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}



      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or subject…"
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-slate-500">No teachers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(teacher => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border bg-slate-100 flex items-center justify-center">
                          {teacher.image_url ? (
                            <Image src={teacher.image_url} alt={teacher.first_name} fill className="object-cover" sizes="40px" />
                          ) : (
                            <User className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {teacher.first_name} {teacher.last_name}
                      </TableCell>
                      <TableCell className="text-sm">{teacher.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {teacher.subject}
                        </span>
                      </TableCell>
                      <TableCell>{teacher.phone || '—'}</TableCell>
                      <TableCell>{teacher.join_date}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copy QR Link"
                            onClick={() => copyQrLink(teacher)}
                          >
                            <Link className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teachers/${teacher.id}`)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => { setDeleteId(teacher.id); setDeleteDialogOpen(true) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">Are you sure you want to delete this teacher? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        columns={TEACHER_CSV_COLUMNS}
        tableName="teachers"
        entityName="Teachers"
        transformRow={(row) => ({
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          subject: row.subject,
          phone: row.phone || null,
          join_date: row.join_date || new Date().toISOString().split('T')[0],
          date_of_birth: row.date_of_birth || null,
          gender: row.gender || null,
          address: row.address || null,
          qualification: row.qualification || null,
          experience_years: row.experience_years ? parseInt(row.experience_years, 10) : 0,
          teacherid: row.teacherid || null,
        })}
        onSuccess={fetchAll}
      />
    </div>
  )
}
