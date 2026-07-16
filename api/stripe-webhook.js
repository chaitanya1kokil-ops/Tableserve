import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Stripe signature verification needs the raw request body, so disable Vercel's
// automatic body parsing for this function.
export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

const iso = (unixSeconds) => (unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  let event
  try {
    const raw = await readRawBody(req)
    event = stripe.webhooks.constructEvent(
      raw,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const update = async (restaurantId, fields) => {
    if (!restaurantId) return
    const { error } = await supabase.from('restaurants').update(fields).eq('id', restaurantId)
    if (error) console.error('restaurant update failed:', error.message)
  }

  // Map a Stripe subscription status to whether the restaurant should be live.
  const restaurantStatusFor = (subStatus) => {
    if (['active', 'trialing'].includes(subStatus)) return 'active'
    if (['canceled', 'unpaid'].includes(subStatus)) return 'suspended'
    return null // past_due / incomplete → leave status as-is, don't cut them off yet
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        const restaurantId = s.metadata?.restaurant_id
        const sub = s.subscription ? await stripe.subscriptions.retrieve(s.subscription) : null
        await update(restaurantId, {
          stripe_customer_id: s.customer,
          stripe_subscription_id: s.subscription,
          subscription_status: sub?.status || 'trialing',
          trial_ends_at: iso(sub?.trial_end),
          current_period_end: iso(sub?.current_period_end),
          status: 'active',
        })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const restaurantId = sub.metadata?.restaurant_id
        const fields = {
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          trial_ends_at: iso(sub.trial_end),
          current_period_end: iso(sub.current_period_end),
        }
        const rs = restaurantStatusFor(sub.status)
        if (rs) fields.status = rs
        await update(restaurantId, fields)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await update(sub.metadata?.restaurant_id, {
          subscription_status: 'canceled',
          status: 'suspended',
        })
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription)
          await update(sub.metadata?.restaurant_id, { subscription_status: 'past_due' })
        }
        break
      }

      default:
        break
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}
