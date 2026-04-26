'use client'
import { Users, BookOpen, Calendar, AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/hooks/useTimetable'
import { useTermStore } from '@/store'
import StatCard from '@/components/features/dashboard/StatCard'
import TermProgress from '@/components/features/dashboard/TermProgress'
import ActionButton from '@/components/features/dashboard/ActionButton'

export default function DashboardPage() {
  const { activeTerm } = useTermStore()
  const { data, isLoading } = useDashboard()

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-xl font-bold text-gray-900'>Dashboard</h1>
        <p className='text-sm text-gray-500 mt-0.5'>{activeTerm?.name ?? 'No term selected'}</p>
      </div>
      {isLoading && <div className='h-32 rounded-xl bg-gray-100 animate-pulse' />}
      {data && (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard label='Cohorts'   value={data.total_cohorts ?? 0}      icon={Users}         accent='blue' />
          <StatCard label='Trainers'  value={data.total_trainers ?? 0}     icon={BookOpen}      accent='emerald' />
          <StatCard label='Sessions'  value={data.scheduled_units ?? 0}    icon={Calendar}      accent='amber' />
          <StatCard label='Conflicts' value={data.pending_conflicts ?? 0}  icon={AlertTriangle} accent='red' />
        </div>
      )}
      {data && <TermProgress data={data} />}
      <ActionButton />
    </div>
  )
}