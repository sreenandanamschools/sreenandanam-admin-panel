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
import { ArrowLeft, Loader2, Save, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'
import type { AcademicYear, Class } from '@/lib/supabase/types'
import { IDCardPreview } from '@/components/id-card/IDCardPreview'
import type { IDCardData, IDCardSettings } from '@/components/id-card/types'

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Attendance stats
  const [attendanceStats, setAttendanceStats] = useState<{ month: string; present: number; total: number; percentage: number }[]>([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [overallPercentage, setOverallPercentage] = useState<number | null>(null)

  // Options
  const [classes, setClasses] = useState<Class[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])

  // Form State
  // Initial enrollment fields
  const [initialClassId, setInitialClassId] = useState('')
  const [initialYearId, setInitialYearId] = useState('')
  const [initialRollNo, setInitialRollNo] = useState('')

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

      // Helper to generate next admission number
      const generateNextAdmissionNo = async () => {
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
        return nextNo
      }

      // 2. Fetch student if editing
      if (!isNew) {
        const { data, error } = await supabase
          .from('students')
          .select(`*, student_enrollments(*)`)
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

        if (!data.admission_no) {
          const nextNo = await generateNextAdmissionNo()
          setForm(f => ({ ...f, admission_no: nextNo }))
        }

        if (data.student_enrollments && data.student_enrollments.length > 0) {
          const activeEnrollment = data.student_enrollments.find((e: any) => e.status === 'active') || data.student_enrollments[0];
          if (activeEnrollment) {
            setInitialClassId(activeEnrollment.class_id || '');
            setInitialYearId(activeEnrollment.academic_year_id || '');
            setInitialRollNo(activeEnrollment.roll_no || '');
          }
        }
      } else {
        const nextNo = await generateNextAdmissionNo()
        setForm(f => ({ ...f, admission_no: nextNo }))
      }
      setIsLoading(false)
    }
    loadData()

    // Load attendance stats if editing
    if (!isNew) {
      loadAttendanceStats()
    }
  }, [id, isNew, router, supabase])

  async function loadAttendanceStats() {
    setIsLoadingAttendance(true)
    try {
      const { data } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('student_id', id)
        .order('date', { ascending: false })

      if (!data || data.length === 0) {
        setIsLoadingAttendance(false)
        return
      }

      const monthly: Record<string, { present: number; total: number }> = {}
      let totalPresent = 0
      const totalDays = data.length

      data.forEach((a: any) => {
        const monthKey = a.date.substring(0, 7)
        if (!monthly[monthKey]) monthly[monthKey] = { present: 0, total: 0 }
        monthly[monthKey].total++
        if (a.status === 'Present') {
          monthly[monthKey].present++
          totalPresent++
        }
      })

      const stats = Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          present: d.present,
          total: d.total,
          percentage: Math.round((d.present / d.total) * 100),
        }))

      setAttendanceStats(stats)
      setOverallPercentage(totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : null)
    } catch (e) {
      console.error('Error loading attendance stats:', e)
    } finally {
      setIsLoadingAttendance(false)
    }
  }

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
            roll_no: initialRollNo || null,
            status: 'active',
          })
          if (enrollErr) throw enrollErr
        }

        toast.success('Student created successfully')
        router.push('/dashboard/students')
      } else {
        const { error } = await supabase.from('students').update(payload).eq('id', id)
        if (error) throw error

        if (initialClassId && initialYearId) {
          const { data: existingEnrollment } = await supabase
            .from('student_enrollments')
            .select('id')
            .eq('student_id', id)
            .eq('academic_year_id', initialYearId)
            .single()

          if (existingEnrollment) {
            await supabase.from('student_enrollments').update({ 
              class_id: initialClassId,
              roll_no: initialRollNo || null,
            }).eq('id', existingEnrollment.id)
          } else {
            await supabase.from('student_enrollments').insert({
              student_id: id,
              class_id: initialClassId,
              academic_year_id: initialYearId,
              roll_no: initialRollNo || null,
              status: 'active',
            })
          }
        }

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

  const selectedClass = classes.find(c => c.id === initialClassId);

  const idCardData: IDCardData = {
    schoolName: "Sreenandanam Public School",
    schoolAddress: "",
    schoolPhone: "",
    schoolEmail: "",
    establishedYear: "",
    studentName: form.full_name || "Student Name",
    studentPhoto: form.image_url || "",
    grade: selectedClass ? selectedClass.class_name : "",
    stream: selectedClass?.section ? selectedClass.section : "",
    idNumber: form.admission_no || "Admission No",
    academicYear: academicYears.find(y => y.id === initialYearId)?.name || "",
    bloodGroup: form.blood_group || "-",
    expiryDate: "",
  }

  const idCardSettings: IDCardSettings = {
    themeColor: "#1aaa85",
    showBack: false,
    cardSize: "CR80",
    fontFamily: "Inter, sans-serif",
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
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
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Create Student' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: ID Card Preview */}
        <div className="space-y-6 lg:col-span-6">
          <Card className="sticky top-6 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 text-center border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">ID Card Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center gap-4 pt-6 pb-6 bg-slate-50/50 overflow-hidden">
              <div className="flex flex-col items-center scale-[0.85] origin-center -mx-4">
                <IDCardPreview data={idCardData} settings={idCardSettings} isBack={false} />
              </div>
              <div className="flex flex-col items-center scale-[0.85] origin-center -mx-4">
                <IDCardPreview data={idCardData} settings={idCardSettings} isBack={true} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Forms */}
        <div className="lg:col-span-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="contact">Contact & Parents</TabsTrigger>
              <TabsTrigger value="academics">Academics</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Avatar Upload */}
                  <div className="flex justify-center border-b pb-6">
                    <ImageUpload
                      folder="students"
                      value={form.image_url}
                      onChange={(url) => setForm({ ...form, image_url: url })}
                      onRemove={() => setForm({ ...form, image_url: null })}
                    />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* System Details Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">System Details</h3>
                      <div className="space-y-2 pt-2">
                          <Label htmlFor="admission_no">Admission Number *</Label>
                          <Input
                            id="admission_no"
                            value={form.admission_no}
                            onChange={e => setForm({ ...form, admission_no: e.target.value })}
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

                    {/* Personal Details Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Personal Details</h3>
                      <div className="space-y-2 pt-2">
                        <Label>Full Name *</Label>
                        <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Gender</Label>
                          <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
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
                          <Select value={form.blood_group} onValueChange={v => setForm({ ...form, blood_group: v })}>
                            <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                            <SelectContent>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    <Input value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} placeholder="Jane Doe" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Phone</Label>
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Residential Address</Label>
                    <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, Country" />
                  </div>

                  <div className="space-y-2">
                    <Label>Emergency Contact Number</Label>
                    <Input value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} placeholder="+1 987 654 3210" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academics" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Academic Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Select value={initialYearId} onValueChange={setInitialYearId}>
                        <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                        <SelectContent>
                          {academicYears.map(ay => (
                            <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={initialClassId} onValueChange={setInitialClassId}>
                        <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.class_name} {c.section ? ` - ${c.section}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Roll Number</Label>
                      <Input value={initialRollNo} onChange={e => setInitialRollNo(e.target.value)} placeholder="e.g. 15" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAttendance ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : attendanceStats.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500">
                      No attendance records found for this student.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Overall */}
                      {overallPercentage !== null && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                          <div className={`p-3 rounded-full ${
                            overallPercentage >= 75 ? 'bg-green-100 text-green-700' :
                            overallPercentage >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {overallPercentage >= 75 ? <CheckCircle className="h-6 w-6" /> :
                             overallPercentage >= 50 ? <Clock className="h-6 w-6" /> :
                             <XCircle className="h-6 w-6" />}
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-900">{overallPercentage}%</p>
                            <p className="text-sm text-slate-500">Overall Attendance</p>
                          </div>
                        </div>
                      )}

                      {/* Monthly breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700">Monthly Breakdown</h4>
                        {attendanceStats.map(month => (
                          <div key={month.month} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                            <div className="w-24 text-sm font-medium text-slate-700">
                              {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  month.percentage >= 75 ? 'bg-green-500' :
                                  month.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${month.percentage}%` }}
                              />
                            </div>
                            <div className="w-32 text-right">
                              <span className={`text-sm font-bold ${
                                month.percentage >= 75 ? 'text-green-700' :
                                month.percentage >= 50 ? 'text-amber-700' : 'text-red-700'
                              }`}>{month.percentage}%</span>
                              <span className="text-xs text-slate-500 ml-2">{month.present}/{month.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-6 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Present</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Late</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Absent</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Half-day</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
