import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Kept in sync with PLANS (src/lib/constants.js) and api/create-checkout.js.
// Yearly = 10× monthly (2 months free).
const PLAN_PRICES = {
  starter: { month: 9900, year: 99000, name: 'TableServe Starter' },
  pro: { month: 17900, year: 179000, name: 'TableServe Pro' },
  premium: { month: 29900, year: 299000, name: 'TableServe Premium' },
  food_truck: { month: 7900, year: 79000, name: 'TableServe Food Truck' },
}
const CURRENCY = 'cad'

async function getOrCreatePrice(stripe, plan, interval) {
  const def = PLAN_PRICES[plan]
  if (!def) return null
  const amount = interval === 'year' ? def.year : def.month
  const lookupKey = `tableserve_${plan}_${interval}_${CURRENCY}`
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  if (found.data.length) return found.data[0]
  const product = await stripe.products.create({ name: def.name })
  return stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: CURRENCY,
    recurring: { interval },
    lookup_key: lookupKey,
  })
}

// Switch an existing subscription to a different plan and/or interval
// (upgrade/downgrade, or monthly↔yearly). No subscription yet → tell the client
// to start one via Checkout.
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
    const interval = req.body?.interval === 'year' ? 'year' : 'month'
    if (!restaurantId || !PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Missing or invalid restaurantId/plan' })
    }

    const { data: r } = await supabase
      .from('restaurants')
      .select('stripe_subscription_id')
      .eq('id', restaurantId)
      .single()

    if (!r?.stripe_subscription_id) {
      return res.status(200).json({ needsCheckout: true })
    }

    const price = await getOrCreatePrice(stripe, plan, interval)
    const sub = await stripe.subscriptions.retrieve(r.stripe_subscription_id)
    const itemId = sub.items.data[0]?.id

    await stripe.subscriptions.update(r.stripe_subscription_id, {
      items: [{ id: itemId, price: price.id }],
      proration_behavior: sub.status === 'trialing' ? 'none' : 'create_prorations',
      metadata: { restaurant_id: restaurantId, plan },
    })

    await supabase
      .from('restaurants')
      .update({ plan, billing_interval: interval })
      .eq('id', restaurantId)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('change-plan error:', err)
    return res.status(500).json({ error: err.message })
  }
}
