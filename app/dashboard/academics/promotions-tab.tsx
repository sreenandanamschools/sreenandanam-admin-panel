'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { StudentEnrollment, AcademicYear, Class } from '@/lib/supabase/types'
import { toast } from 'sonner'

export default function PromotionsTab() {
  const supabase = createClient()

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [classes, setClasses] = useState<Class[]>([])

  // Source selection
  const [sourceYearId, setSourceYearId] = useState('')
  const [sourceClassId, setSourceClassId] = useState('')
  const [sourceEnrollments, setSourceEnrollments] = useState<StudentEnrollment[]>([])
  
  // Target selection
  const [targetYearId, setTargetYearId] = useState('')
  const [targetClassId, setTargetClassId] = useState('')

  // State
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      const [ { data: years }, { data: cls } ] = await Promise.all([
        supabase.from('academic_years').select('*').order('start_date', { ascending: false }),
        supabase.from('classes').select('*').order('class_name'),
      ])
      setAcademicYears(years || [])
      setClasses(cls || [])
    }
    loadData()
  }, [supabase])

  // Fetch enrollments when source changes
  useEffect(() => {
    async function fetchEnrollments() {
      if (!sourceYearId || !sourceClassId) {
        setSourceEnrollments([])
        return
      }
      setIsLoading(true)
      const { data } = await supabase
        .from('student_enrollments')
        .select('*, students(full_name, admission_no)')
        .eq('academic_year_id', sourceYearId)
        .eq('class_id', sourceClassId)
        .eq('status', 'active')
        .order('roll_no', { ascending: true })

      setSourceEnrollments(data || [])
      setSelectedEnrollmentIds(new Set())
      setIsLoading(false)
    }
    fetchEnrollments()
  }, [sourceYearId, sourceClassId, supabase])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEnrollmentIds(new Set(sourceEnrollments.map(e => e.id)))
    } else {
      setSelectedEnrollmentIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedEnrollmentIds)
    if (checked) newSet.add(id)
    else newSet.delete(id)
    setSelectedEnrollmentIds(newSet)
  }

  const handlePromote = async () => {
    if (selectedEnrollmentIds.size === 0) return toast.error("Select students to promote")
    if (!targetYearId || !targetClassId) return toast.error("Select target year and class")
    if (sourceYearId === targetYearId) return toast.error("Target academic year must be different from source")

    setIsPromoting(true)
    try {
      const selectedRecords = sourceEnrollments.filter(e => selectedEnrollmentIds.has(e.id))

      const newEnrollments = selectedRecords.map(e => ({
        student_id: e.student_id,
        academic_year_id: targetYearId,
        class_id: targetClassId,
        status: 'active',
        promoted_from_enrollment_id: e.id,
      }))

      const { error: insErr } = await supabase.from('student_enrollments').insert(newEnrollments)
      if (insErr) throw insErr

      const { error: updErr } = await supabase
        .from('student_enrollments')
        .update({ status: 'promoted' })
        .in('id', Array.from(selectedEnrollmentIds))
        
      if (updErr) throw updErr

      toast.success(`Successfully promoted ${selectedEnrollmentIds.size} students!`)
      
      setSourceEnrollments(prev => prev.filter(e => !selectedEnrollmentIds.has(e.id)))
      setSelectedEnrollmentIds(new Set())
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsPromoting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Promotion Workflow</h2>
        <p className="text-sm text-slate-500 mt-1">Bulk promote students to the next academic year without losing historical data</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Source Configuration */}
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 pb-4">
            <CardTitle className="text-lg text-blue-900">1. Select Current Class</CardTitle>
            <CardDescription>Choose the class you want to promote students from</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Source Academic Year</Label>
              <Select value={sourceYearId} onValueChange={setSourceYearId}>
                <SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger>
                <SelectContent>
                  {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Class</Label>
              <Select value={sourceClassId} onValueChange={setSourceClassId}>
                <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name} {c.section || ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Target Configuration */}
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="bg-green-50/50 pb-4">
            <CardTitle className="text-lg text-green-900">2. Select Next Class</CardTitle>
            <CardDescription>Choose where these students will go next</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Target Academic Year</Label>
              <Select value={targetYearId} onValueChange={setTargetYearId}>
                <SelectTrigger><SelectValue placeholder="Select next year..." /></SelectTrigger>
                <SelectContent>
                  {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Class</Label>
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger><SelectValue placeholder="Select next class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name} {c.section || ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>3. Select Students</CardTitle>
            <CardDescription>
              {sourceYearId && sourceClassId 
                ? `Found ${sourceEnrollments.length} active students eligible for promotion` 
                : 'Select source class to load students'}
            </CardDescription>
          </div>
          <Button 
            disabled={selectedEnrollmentIds.size === 0 || isPromoting || !targetYearId || !targetClassId} 
            onClick={handlePromote}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isPromoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Promote {selectedEnrollmentIds.size > 0 ? selectedEnrollmentIds.size : ''} Students
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : sourceEnrollments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
              <p className="text-slate-500 font-medium">No active students to display</p>
              <p className="text-slate-400 text-sm mt-1">Select a valid source academic year and class above.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox 
                        checked={selectedEnrollmentIds.size === sourceEnrollments.length && sourceEnrollments.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll No</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceEnrollments.map(e => {
                    const student = e.students as any
                    return (
                      <TableRow key={e.id} className={selectedEnrollmentIds.has(e.id) ? 'bg-blue-50/30' : ''}>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={selectedEnrollmentIds.has(e.id)}
                            onCheckedChange={(checked) => handleSelectOne(e.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">{student?.admission_no}</TableCell>
                        <TableCell className="font-medium">{student?.full_name}</TableCell>
                        <TableCell>{e.roll_no || '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
