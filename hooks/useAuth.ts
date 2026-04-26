import { useAuthStore } from '@/store'

export function useAuth() {
  const { token, user, setAuth, logout } = useAuthStore()
  const isAdmin = user?.is_staff ?? false
  const isCoordinator = user?.groups?.includes('Coordinator') ?? false
  const isTrainer = user?.groups?.includes('Trainer') ?? false
  const isAuthenticated = !!token

  return { token, user, setAuth, logout, isAdmin, isCoordinator, isTrainer, isAuthenticated }
}
