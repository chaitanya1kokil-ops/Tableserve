import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Plan → Stripe price. Amounts in cents; a recurring monthly price is created
// once per plan (keyed by lookup_key) and reused thereafter. Kept in sync with
// PLANS in src/lib/constants.js.
const PLAN_PRICES = {
  starter: { amount: 9900, name: 'TableServe Starter' },
  pro: { amount: 17900, name: 'TableServe Pro' },
  premium: { amount: 29900, name: 'TableServe Premium' },
  food_truck: { amount: 7900, name: 'TableServe Food Truck' },
}

const TRIAL_DAYS = 14
const CURRENCY = 'usd'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  // If Stripe isn't configured yet, tell the client to finish onboarding
  // without payment (keeps the flow working before keys are wired).
  if (!secret) return res.status(200).json({ skip: true })

  const stripe = new Stripe(secret)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  try {
    const { restaurantId, plan, email } = req.body || {}
    const def = PLAN_PRICES[plan]
    if (!restaurantId || !def) return res.status(400).json({ error: 'Missing or invalid restaurantId/plan' })

    // Get-or-create the recurring price for this plan.
    const lookupKey = `tableserve_${plan}_monthly`
    let price
    const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    if (found.data.length) {
      price = found.data[0]
    } else {
      const product = await stripe.products.create({ name: def.name })
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: def.amount,
        currency: CURRENCY,
        recurring: { interval: 'month' },
        lookup_key: lookupKey,
      })
    }

    // Get-or-create the Stripe customer, remembered on the restaurant.
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
      cancel_url: `${origin}/dashboard?billing=cancelled`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
