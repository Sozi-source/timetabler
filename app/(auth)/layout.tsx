export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-gradient-to-br from-[#1e3a5f] via-[#162d4a] to-[#0f1e30] flex items-center justify-center p-4 sm:p-6">
      {children}
    </div>
  )
}
