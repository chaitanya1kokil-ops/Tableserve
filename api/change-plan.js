import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Kept in sync with PLANS (src/lib/constants.js) and api/create-checkout.js.
const PLAN_PRICES = {
  starter: { amount: 9900, name: 'TableServe Starter' },
  pro: { amount: 17900, name: 'TableServe Pro' },
  premium: { amount: 29900, name: 'TableServe Premium' },
  food_truck: { amount: 7900, name: 'TableServe Food Truck' },
}
const CURRENCY = 'usd'

async function getOrCreatePrice(stripe, plan) {
  const def = PLAN_PRICES[plan]
  if (!def) return null
  const lookupKey = `tableserve_${plan}_monthly`
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  if (found.data.length) return found.data[0]
  const product = await stripe.products.create({ name: def.name })
  return stripe.prices.create({
    product: product.id,
    unit_amount: def.amount,
    currency: CURRENCY,
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
  })
}

// Switch an existing subscription to a different plan (upgrade/downgrade).
// If the restaurant has no subscription yet, tell the client to start one via
// Checkout instead.
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
    const { restaurantId, plan } = req.body || {}
    if (!restaurantId || !PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Missing or invalid restaurantId/plan' })
    }

    const { data: r } = await supabase
      .from('restaurants')
      .select('stripe_subscription_id')
      .eq('id', restaurantId)
      .single()

    if (!r?.stripe_subscription_id) {
      // No active subscription — the client should run Checkout to start one.
      return res.status(200).json({ needsCheckout: true })
    }

    const price = await getOrCreatePrice(stripe, plan)
    const sub = await stripe.subscriptions.retrieve(r.stripe_subscription_id)
    const itemId = sub.items.data[0]?.id

    await stripe.subscriptions.update(r.stripe_subscription_id, {
      items: [{ id: itemId, price: price.id }],
      // Trials: no immediate charge. Active subs: prorate the difference.
      proration_behavior: sub.status === 'trialing' ? 'none' : 'create_prorations',
      metadata: { restaurant_id: restaurantId, plan },
    })

    // Reflect the new tier immediately (webhook will confirm status).
    await supabase.from('restaurants').update({ plan }).eq('id', restaurantId)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('change-plan error:', err)
    return res.status(500).json({ error: err.message })
  }
}
