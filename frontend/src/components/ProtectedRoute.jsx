import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PORTAL_LOGIN } from '../utils/format'

// not logged in -> the login page of the portal used last time;
// wrong role -> back to the dashboard
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    const loginPath = PORTAL_LOGIN[localStorage.getItem('lastPortal')] || '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />
  return children
}
