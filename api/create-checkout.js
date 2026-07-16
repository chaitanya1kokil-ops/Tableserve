import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Plan → Stripe amounts (cents). Yearly = 10× monthly (2 months free). Kept in
// sync with PLANS in src/lib/constants.js and api/change-plan.js.
const PLAN_PRICES = {
  starter: { month: 9900, year: 99000, name: 'TableServe Starter' },
  pro: { month: 17900, year: 179000, name: 'TableServe Pro' },
  premium: { month: 29900, year: 299000, name: 'TableServe Premium' },
  food_truck: { month: 7900, year: 79000, name: 'TableServe Food Truck' },
}
const TRIAL_DAYS = 14
const CURRENCY = 'cad'

// Get-or-create the recurring price for a plan + interval. Currency and
// interval are part of the lookup key because Stripe prices are immutable.
export async function getOrCreatePrice(stripe, plan, interval) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(200).json({ skip: true })

  const stripe = new Stripe(secret)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  try {
    const { restaurantId, plan, email } = req.body || {}
    const interval = req.body?.interval === 'year' ? 'year' : 'month'
    if (!restaurantId || !PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Missing or invalid restaurantId/plan' })
    }

    const price = await getOrCreatePrice(stripe, plan, interval)

    const { data: r } = await supabase
      .from('restaurants')
      .select('stripe_customer_id, name')
      .eq('id', restaurantId)
      .single()
    let customerId = r?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        name: r?.name || undefined,
        metadata: { restaurant_id: restaurantId },
      })
      customerId = customer.id
      await supabase.from('restaurants').update({ stripe_customer_id: customerId }).eq('id', restaurantId)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { restaurant_id: restaurantId, plan },
      },
      metadata: { restaurant_id: restaurantId, plan },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard/subscription?billing=cancelled`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
