import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Opens the Stripe-hosted billing portal, where the owner can view/download
// invoices, update their card, and cancel — no card data ever touches us.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(400).json({ error: 'Billing is not configured yet.' })

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
      .select('stripe_customer_id')
      .eq('id', restaurantId)
      .single()
    if (!r?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account yet — start a subscription first.' })
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const session = await stripe.billingPortal.sessions.create({
      customer: r.stripe_customer_id,
      return_url: `${origin}/dashboard/subscription`,
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('billing-portal error:', err)
    return res.status(500).json({ error: err.message })
  }
}
