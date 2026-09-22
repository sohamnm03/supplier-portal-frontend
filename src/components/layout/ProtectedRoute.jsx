import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const HOME_BY_ROLE = { user: '/invoices', guest: '/request-vendor' }

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location }} />

  const currentRole = user?.role || 'user'
  if (role && currentRole !== role) return <Navigate to={HOME_BY_ROLE[currentRole]} replace />

  return children
}
