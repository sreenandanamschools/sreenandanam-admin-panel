'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'
import type { AcademicYear, Class } from '@/lib/supabase/types'

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Options
  const [classes, setClasses] = useState<Class[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])

  // Form State
  // Initial enrollment fields (only used when creating new students)
  const [initialClassId, setInitialClassId] = useState('')
  const [initialYearId, setInitialYearId] = useState('')

  const [form, setForm] = useState({
    admission_no: '',
    full_name: '',
    image_url: null as string | null,
    date_of_birth: '',
    gender: '',
    blood_group: '',
    parent_name: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    is_active: true,
  })

  useEffect(() => {
    async function loadData() {
      // 1. Fetch lookup tables
      const [{ data: cls }, { data: ays }] = await Promise.all([
        supabase.from('classes').select('*').order('class_name'),
        supabase.from('academic_years').select('*').order('start_date', { ascending: false })
      ])
      setClasses(cls || [])
      setAcademicYears(ays || [])

      // 2. Fetch student if editing
      if (!isNew) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          toast.error('Student not found')
          router.push('/dashboard/students')
          return
        }

        setForm({
          admission_no: data.admission_no || '',
          full_name: data.full_name || '',
          image_url: data.image_url || null,
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          blood_group: data.blood_group || '',
          parent_name: data.parent_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          emergency_contact: data.emergency_contact || '',
          is_active: data.is_active,
        })
        // Auto-generate admission_no
        const { data: existingStudents } = await supabase
          .from('students')
          .select('admission_no')
        
        const currentYear = new Date().getFullYear()
        const prefix = `S00${currentYear}`
        let nextNo = `${prefix}01`

        if (existingStudents && existingStudents.length > 0) {
          let maxSeq = 0
          existingStudents.forEach(s => {
            if (s.admission_no && s.admission_no.startsWith(prefix)) {
              const seqStr = s.admission_no.slice(prefix.length)
              const seq = parseInt(seqStr, 10)
              if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq
              }
            }
          })
          if (maxSeq > 0) {
            nextNo = `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
          }
        }
        setForm(f => ({ ...f, admission_no: nextNo }))
      }
      setIsLoading(false)
    }
    loadData()
  }, [id, isNew, router, supabase])

  const handleSave = async () => {
    if (!form.full_name || !form.admission_no) {
      return toast.error('Name and Admission No are required')
    }

    setIsSaving(true)
    try {
      const payload = {
        ...form,
        date_of_birth: form.date_of_birth || null,
      }

      if (isNew) {
        const { data: newStudent, error } = await supabase.from('students').insert(payload).select('id').single()
        if (error) throw error

        // Create initial enrollment if class and year are selected
        if (initialClassId && initialYearId && newStudent) {
          const { error: enrollErr } = await supabase.from('student_enrollments').insert({
            student_id: newStudent.id,
            class_id: initialClassId,
            academic_year_id: initialYearId,
            status: 'active',
          })
          if (enrollErr) throw enrollErr
        }

        toast.success('Student created successfully')
        router.push('/dashboard/students')
      } else {
        const { error } = await supabase.from('students').update(payload).eq('id', id)
        if (error) throw error
        toast.success('Student profile updated')
        router.push('/dashboard/students')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isNew ? 'New Student Profile' : form.full_name}
            </h1>
            <p className="text-sm text-slate-500">
              {isNew ? 'Add a new student to the system' : `Admission No: ${form.admission_no}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Create Student' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Quick Status */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <ImageUpload 
                folder="students"
                value={form.image_url} 
                onChange={(url) => setForm({ ...form, image_url: url })}
                onRemove={() => setForm({ ...form, image_url: null })}
              />
              <div className="mt-6 space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-700">ID & System Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="admission_no">Admission Number (Student ID) *</Label>
                  <Input 
                    id="admission_no"
                    value={form.admission_no} 
                    onChange={e => setForm({...form, admission_no: e.target.value})} 
                    placeholder="e.g. S00202601" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={form.is_active ? 'active' : 'inactive'} 
                    onValueChange={(v) => setForm({ ...form, is_active: v === 'active' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Enrolled)</SelectItem>
                      <SelectItem value="inactive">Inactive (Left/Graduated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Forms */}
        <div className="md:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="contact">Contact & Parents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Group</Label>
                      <Select value={form.blood_group} onValueChange={v => setForm({...form, blood_group: v})}>
                        <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academic" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Initial Admission Details</CardTitle>
                  <p className="text-sm text-slate-500">Note: Yearly progression should be managed via the Enrollments module.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isNew && (
                    <p className="text-sm text-slate-600">
                      Admission Number: <strong className="font-semibold">{form.admission_no}</strong> (Managed in ID & System Details)
                    </p>
                  )}
                  
                  {isNew && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="col-span-2"><Label className="text-blue-800">Initial Enrollment Assignment</Label></div>
                      <div className="space-y-2">
                        <Label>Joining Academic Year</Label>
                        <Select value={initialYearId} onValueChange={setInitialYearId}>
                          <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                          <SelectContent>
                            {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Joining Class</Label>
                        <Select value={initialClassId} onValueChange={setInitialClassId}>
                          <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                          <SelectContent>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name} {c.section || ''}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact & Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Parent / Guardian Name</Label>
                    <Input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} placeholder="Jane Doe" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Phone</Label>
                      <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 234 567 8900" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@example.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Residential Address</Label>
                    <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St, City, Country" />
                  </div>

                  <div className="space-y-2">
                    <Label>Emergency Contact Number</Label>
                    <Input value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})} placeholder="+1 987 654 3210" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  )
}
