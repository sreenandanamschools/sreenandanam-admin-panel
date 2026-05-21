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

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject: '',
    join_date: new Date().toISOString().split('T')[0],
    image_url: null as string | null,
    date_of_birth: '',
    gender: '',
    address: '',
    qualification: '',
    experience_years: 0,
  })

  useEffect(() => {
    async function loadData() {
      if (!isNew) {
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          toast.error('Teacher not found')
          router.push('/dashboard/teachers')
          return
        }

        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          subject: data.subject || '',
          join_date: data.join_date || '',
          image_url: data.image_url || null,
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          address: data.address || '',
          qualification: data.qualification || '',
          experience_years: data.experience_years || 0,
        })
      }
      setIsLoading(false)
    }
    loadData()
  }, [id, isNew, router, supabase])

  const handleSave = async () => {
    if (!form.first_name || !form.email || !form.subject) {
      return toast.error('First Name, Email, and Subject are required')
    }

    setIsSaving(true)
    try {
      if (isNew) {
        const { error } = await supabase.from('teachers').insert({
          ...form,
          date_of_birth: form.date_of_birth || null,
        })
        if (error) throw error
        toast.success('Teacher added successfully')
        router.push('/dashboard/teachers')
      } else {
        const { error } = await supabase.from('teachers').update({
          ...form,
          date_of_birth: form.date_of_birth || null,
        }).eq('id', id)
        if (error) throw error
        toast.success('Teacher profile updated')
        router.push('/dashboard/teachers')
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
              {isNew ? 'New Teacher Profile' : `${form.first_name} ${form.last_name}`}
            </h1>
            <p className="text-sm text-slate-500">
              {isNew ? 'Add a new staff member to the system' : `Subject: ${form.subject}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Add Teacher' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Quick Status */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <ImageUpload 
                folder="teachers"
                value={form.image_url} 
                onChange={(url) => setForm({ ...form, image_url: url })}
                onRemove={() => setForm({ ...form, image_url: null })}
              />
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} />
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
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="contact">Contact & Address</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="Doe" />
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
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Academic & Professional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Subject *</Label>
                      <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="e.g. Mathematics" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Highest Qualification</Label>
                      <Input value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="e.g. M.Sc, B.Ed" />
                    </div>
                    <div className="space-y-2">
                      <Label>Experience (Years)</Label>
                      <Input 
                        type="number" 
                        value={form.experience_years} 
                        onChange={e => setForm({...form, experience_years: parseInt(e.target.value) || 0})} 
                        min="0" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="teacher@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 234 567 8900" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Residential Address</Label>
                    <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St, City, Country" />
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
