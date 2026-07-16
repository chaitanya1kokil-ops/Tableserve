import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Reports whether a food truck's connected Stripe account can accept charges,
// and syncs stripe_connect_ready onto the restaurant.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(200).json({ connected: false, ready: false })

  const stripe = new Stripe(secret)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  try {
    const { restaurantId } = req.body || {}
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' })

    const { data: r } = await supabase
      .from('restaurants')
      .select('stripe_connect_account_id')
      .eq('id', restaurantId)
      .single()

    if (!r?.stripe_connect_account_id) return res.status(200).json({ connected: false, ready: false })

    const acct = await stripe.accounts.retrieve(r.stripe_connect_account_id)
    const ready = !!acct.charges_enabled
    await supabase.from('restaurants').update({ stripe_connect_ready: ready }).eq('id', restaurantId)

    return res.status(200).json({
      connected: true,
      ready,
      chargesEnabled: !!acct.charges_enabled,
      detailsSubmitted: !!acct.details_submitted,
      payoutsEnabled: !!acct.payouts_enabled,
    })
  } catch (err) {
    console.error('connect-status error:', err)
    return res.status(500).json({ error: err.message })
  }
}
