import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Stripe Connect for food trucks — onboarding link and account status.
//
// These were two endpoints (connect-onboard, connect-status). They share their
// dependencies, their setup and their caller, and Vercel's plan caps a
// deployment at 12 serverless functions — adding the contact endpoint pushed us
// to 13 and the deploy failed. Folding them into one action-routed handler
// costs nothing in clarity and buys back a slot.
//
// POST { action: 'onboard' | 'status', restaurantId }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, restaurantId } = req.body || {}
  if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    // Status is a read: answer honestly rather than erroring the settings page.
    return action === 'status'
      ? res.status(200).json({ connected: false, ready: false })
      : res.status(400).json({ error: 'Payments are not configured yet.' })
  }

  const stripe = new Stripe(secret)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  try {
    if (action === 'status') {
      const { data: r } = await supabase
        .from('restaurants')
        .select('stripe_connect_account_id')
        .eq('id', restaurantId)
        .single()

      if (!r?.stripe_connect_account_id) {
        return res.status(200).json({ connected: false, ready: false })
      }

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
    }

    // ---- onboard -----------------------------------------------------------
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
      await supabase
        .from('restaurants')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', restaurantId)
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
    console.error(`connect (${action}) error:`, err)
    return res.status(500).json({ error: err.message })
  }
}
