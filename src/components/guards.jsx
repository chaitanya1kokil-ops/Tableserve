import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './ui'

/** Requires a signed-in owner/staff who has completed onboarding. */
export function RequireOwner({ children }) {
  const { loading, profileChecked, user, isAnonymous, profile, restaurant } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner label="Loading…" />
  if (!user || isAnonymous) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profileChecked) return <FullPageSpinner label="Loading…" />
  if (profile?.role === 'platform_admin') return <Navigate to="/admin" replace />
  if (!restaurant) return <Navigate to="/onboarding" replace />

  return children
}

/** The onboarding page: signed in, not an admin, no restaurant yet. */
export function RequireOnboarding({ children }) {
  const { loading, profileChecked, user, isAnonymous, profile, restaurant } = useAuth()

  if (loading) return <FullPageSpinner label="Loading…" />
  if (!user || isAnonymous) return <Navigate to="/login" replace />
  if (!profileChecked) return <FullPageSpinner label="Loading…" />
  if (profile?.role === 'platform_admin') return <Navigate to="/admin" replace />
  if (restaurant) return <Navigate to="/dashboard" replace />

  return children
}

/** Platform admin only. */
export function RequireAdmin({ children }) {
  const { loading, profileChecked, user, isAnonymous, profile } = useAuth()

  if (loading) return <FullPageSpinner label="Loading…" />
  if (!user || isAnonymous) return <Navigate to="/login" replace />
  if (!profileChecked) return <FullPageSpinner label="Loading…" />
  if (profile?.role !== 'platform_admin') return <Navigate to="/dashboard" replace />

  return children
}
