'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AcademicYearsTab from './academic-years-tab'
import EnrollmentsTab from './enrollments-tab'
import PromotionsTab from './promotions-tab'

export default function AcademicsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') || 'years'

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/academics?tab=${value}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Academics</h1>
        <p className="text-slate-600 mt-1">Manage academic years, student enrollments, and promotions</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="years" className="mt-4">
          <AcademicYearsTab />
        </TabsContent>
        <TabsContent value="enrollments" className="mt-4">
          <EnrollmentsTab />
        </TabsContent>
        <TabsContent value="promotions" className="mt-4">
          <PromotionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
