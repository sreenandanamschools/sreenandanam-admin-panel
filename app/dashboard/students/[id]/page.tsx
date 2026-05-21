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
    // Legacy fields for initial setup (handled via enrollments ideally, but keeping here for simple onboarding)
    class_id: '',
    academic_year_id: '',
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
          class_id: data.class_id || '',
          academic_year_id: data.academic_year_id || '',
        })
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
        class_id: form.class_id || null,
        academic_year_id: form.academic_year_id || null,
      }

      if (isNew) {
        const { error } = await supabase.from('students').insert(payload)
        if (error) throw error
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
              <div className="mt-6 space-y-4">
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
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Admission Number *</Label>
                      <Input value={form.admission_no} onChange={e => setForm({...form, admission_no: e.target.value})} placeholder="e.g. ADM-2026-001" />
                    </div>
                  </div>
                  
                  {isNew && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="col-span-2"><Label className="text-blue-800">Initial Enrollment Assignment</Label></div>
                      <div className="space-y-2">
                        <Label>Joining Academic Year</Label>
                        <Select value={form.academic_year_id} onValueChange={v => setForm({...form, academic_year_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                          <SelectContent>
                            {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Joining Class</Label>
                        <Select value={form.class_id} onValueChange={v => setForm({...form, class_id: v})}>
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
