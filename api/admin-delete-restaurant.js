import { createClient } from '@supabase/supabase-js'

// Permanently delete a client restaurant — and optionally the owner's login.
//
// The restaurant row alone can be deleted straight from the browser (RLS grants
// platform admins delete on restaurants, and every tenant table cascades). What
// the browser CANNOT do is remove the auth user, so that part lives here behind
// the service-role key.
//
// Auth: the caller's Supabase access token must belong to a platform_admin.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return res.status(400).json({ error: 'Account deletion is not configured on this deployment.' })
  }

  const admin = createClient(url, serviceKey)

  try {
    // ---- the caller must be a platform admin --------------------------------
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Not signed in.' })

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    const caller = userData?.user
    if (userErr || !caller) return res.status(401).json({ error: 'Invalid session.' })

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerProfile?.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Platform admins only.' })
    }

    // ---- what are we deleting ----------------------------------------------
    const { restaurantId, deleteOwner } = req.body || {}
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' })

    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id, name, owner_id')
      .eq('id', restaurantId)
      .maybeSingle()

    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' })

    // Deleting the auth user cascades: profiles -> restaurants -> everything
    // tenant-scoped. Only safe when that owner has nothing else on the platform.
    let ownerDeleted = false
    if (deleteOwner && restaurant.owner_id) {
      if (restaurant.owner_id === caller.id) {
        return res.status(400).json({ error: 'You cannot delete your own login.' })
      }

      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', restaurant.owner_id)
        .maybeSingle()

      if (ownerProfile?.role === 'platform_admin') {
        return res.status(400).json({ error: 'That owner is a platform admin — delete the restaurant only.' })
      }

      const { count } = await admin
        .from('restaurants')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', restaurant.owner_id)
        .neq('id', restaurantId)

      if (count > 0) {
        return res.status(400).json({
          error: `That owner still has ${count} other restaurant${count === 1 ? '' : 's'} — delete those first, or delete this restaurant only.`,
        })
      }

      const { error: authErr } = await admin.auth.admin.deleteUser(restaurant.owner_id)
      if (authErr) return res.status(500).json({ error: authErr.message })
      ownerDeleted = true // the cascade already took the restaurant with it
    }

    if (!ownerDeleted) {
      const { error: delErr } = await admin.from('restaurants').delete().eq('id', restaurantId)
      if (delErr) return res.status(500).json({ error: delErr.message })
    }

    return res.status(200).json({ ok: true, ownerDeleted })
  } catch (err) {
    console.error('admin-delete-restaurant error:', err)
    return res.status(500).json({ error: err.message })
  }
}
