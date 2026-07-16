import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Creates (or reuses) an Express connected account for a food truck and returns
// a Stripe-hosted onboarding link. Requires Connect to be enabled on the
// platform account.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(400).json({ error: 'Payments are not configured yet.' })

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
      .select('stripe_connect_account_id, name')
      .eq('id', restaurantId)
      .single()

    let accountId = r?.stripe_connect_account_id
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        business_profile: { name: r?.name || undefined },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { restaurant_id: restaurantId },
      })
      accountId = account.id
      await supabase.from('restaurants').update({ stripe_connect_account_id: accountId }).eq('id', restaurantId)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/subscription?connect=refresh`,
      return_url: `${origin}/dashboard/subscription?connect=return`,
      type: 'account_onboarding',
    })

    return res.status(200).json({ url: link.url })
  } catch (err) {
    console.error('connect-onboard error:', err)
    return res.status(500).json({ error: err.message })
  }
}
