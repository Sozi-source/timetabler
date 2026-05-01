import TimetableAI from '@/components/features/timetable/TimetableAI'

export default function TimetableLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TimetableAI />
    </>
  )
}