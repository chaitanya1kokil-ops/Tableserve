import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Keep the raw owner-PIN hash out of client state; expose only whether one is
// set. (The PIN is verified server-side via verify_owner_pin.)
function stripPin(rest) {
  if (!rest) return null
  const { owner_pin, ...safe } = rest
  return { ...safe, owner_pin_set: Boolean(owner_pin) }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true) // initial session check
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false) // first load done?
  // Owner mode: unlocked with the PIN, remembered for the browser session only.
  const [ownerMode, setOwnerMode] = useState(() => {
    try {
      return sessionStorage.getItem('ts-owner-mode') === '1'
    } catch {
      return false
    }
  })
  // Impersonation: a platform admin viewing a specific restaurant's dashboard as
  // its owner. Kept per-tab (sessionStorage) so a refresh stays in, but a new tab
  // starts clean and signing out clears it. RLS already grants admins full access
  // to every tenant table, so this is a pure client-side view switch.
  const [impersonatedId, setImpersonatedId] = useState(() => {
    try {
      return sessionStorage.getItem('ts-impersonate') || null
    } catch {
      return null
    }
  })

  // 1. Track the auth session.
  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Load the profile + restaurant for real (non-anonymous) users.
  const userId = session?.user?.id
  const isAnonymous = Boolean(session?.user?.is_anonymous)

  const loadProfile = useCallback(async () => {
    if (!userId || isAnonymous) {
      setProfile(null)
      setRestaurant(null)
      setProfileChecked(true)
      return
    }
    setProfileLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      setProfile(prof || null)

      // Admins impersonating a restaurant load that one; everyone else loads
      // the restaurant linked to their own profile.
      const isAdminRole = prof?.role === 'platform_admin'
      const targetId = isAdminRole && impersonatedId ? impersonatedId : prof?.restaurant_id
      if (targetId) {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', targetId)
          .maybeSingle()
        setRestaurant(stripPin(rest))
      } else {
        setRestaurant(null)
      }
    } finally {
      setProfileLoading(false)
      setProfileChecked(true)
    }
  }, [userId, isAnonymous, impersonatedId])

  useEffect(() => {
    setProfileChecked(false)
    loadProfile()
  }, [loadProfile])

  const refreshRestaurant = useCallback(async () => {
    const id = restaurant?.id || profile?.restaurant_id
    if (!id) {
      // restaurant_id may have just been set on the profile — reload profile.
      await loadProfile()
      return
    }
    const { data } = await supabase.from('restaurants').select('*').eq('id', id).maybeSingle()
    setRestaurant(stripPin(data))
  }, [restaurant?.id, profile?.restaurant_id, loadProfile])

  const signUp = useCallback(async ({ email, password, fullName }) => {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRestaurant(null)
    setOwnerMode(false)
    setImpersonatedId(null)
    try {
      sessionStorage.removeItem('ts-owner-mode')
      sessionStorage.removeItem('ts-impersonate')
    } catch {
      /* ignore */
    }
  }, [])

  // Admin: start viewing a restaurant's dashboard as its owner. Reloading the
  // profile (via the impersonatedId dependency) swaps in that restaurant.
  const impersonate = useCallback((restId) => {
    try {
      sessionStorage.setItem('ts-impersonate', restId)
    } catch {
      /* ignore */
    }
    setImpersonatedId(restId)
  }, [])

  const stopImpersonating = useCallback(() => {
    try {
      sessionStorage.removeItem('ts-impersonate')
    } catch {
      /* ignore */
    }
    setImpersonatedId(null)
  }, [])

  // Verify the owner PIN server-side; on success unlock owner mode for the session.
  const unlockOwner = useCallback(async (pin) => {
    const { data, error } = await supabase.rpc('verify_owner_pin', { p_pin: pin })
    if (error || !data) return false
    setOwnerMode(true)
    try {
      sessionStorage.setItem('ts-owner-mode', '1')
    } catch {
      /* ignore */
    }
    return true
  }, [])

  const lockOwner = useCallback(() => {
    setOwnerMode(false)
    try {
      sessionStorage.removeItem('ts-owner-mode')
    } catch {
      /* ignore */
    }
  }, [])

  const isAdmin = profile?.role === 'platform_admin'
  // True only once the impersonated restaurant has actually loaded, so guards
  // never briefly admit an admin to an empty dashboard.
  const isImpersonating = isAdmin && Boolean(impersonatedId) && Boolean(restaurant)

  const value = {
    session,
    user: session?.user || null,
    isAnonymous,
    profile,
    restaurant,
    loading,
    profileLoading,
    profileChecked,
    isAdmin,
    isImpersonating,
    impersonate,
    stopImpersonating,
    // Owner/staff mode. When no PIN is set, the account behaves as owner (no
    // split) so nothing changes for accounts that never configure it. An
    // impersonating admin always gets full owner powers (no PIN to know).
    ownerPinSet: Boolean(restaurant?.owner_pin_set),
    ownerMode,
    isOwner: isImpersonating ? true : !restaurant?.owner_pin_set || ownerMode,
    unlockOwner,
    lockOwner,
    refreshProfile: loadProfile,
    refreshRestaurant,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
