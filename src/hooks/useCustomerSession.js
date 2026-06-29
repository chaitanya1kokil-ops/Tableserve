import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Ensures there is a Supabase session for the customer ordering flow.
 * If none exists, signs the customer in anonymously (no login screen).
 * Requires "Anonymous sign-ins" to be enabled in Supabase Auth settings.
 *
 * Returns { ready, error } — render the menu only once `ready` is true.
 */
export function useCustomerSession() {
  const { session, loading } = useAuth()
  const [ready, setReady] = useState(Boolean(session))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (loading) return
    if (session) {
      setReady(true)
      return
    }
    let active = true
    ;(async () => {
      const { error: err } = await supabase.auth.signInAnonymously()
      if (!active) return
      if (err) setError(err)
      else setReady(true)
    })()
    return () => {
      active = false
    }
  }, [session, loading])

  return { ready, error }
}
