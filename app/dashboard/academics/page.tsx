import { Suspense } from 'react'
import AcademicsContent from './academics-content'

export default function AcademicsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Academics</h1>
          <p className="text-slate-600 mt-1">Loading academic management...</p>
        </div>
      </div>
    }>
      <AcademicsContent />
    </Suspense>
  )
}


