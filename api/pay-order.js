import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Phase 2 — collect payment for a pay-first order (food trucks) on the
// vendor's OWN connected Stripe account (Stripe Connect direct charge), for the
// exact order total. Returns a Stripe Checkout URL to redirect the customer to.
// The order stays 'awaiting_payment' until /api/confirm-payment verifies the
// session was paid and flips it to 'new' (so it reaches the kitchen board).
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
    const { orderId } = req.body || {}
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' })

    const { data: order } = await supabase
      .from('orders')
      .select(
        'id, restaurant_id, total, status, customer_name, ' +
          'restaurant:restaurants(name, currency, stripe_connect_account_id, stripe_connect_ready)',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (order.status !== 'awaiting_payment') {
      return res.status(400).json({ error: 'This order is not awaiting payment.' })
    }

    const r = order.restaurant
    if (!r?.stripe_connect_account_id || !r?.stripe_connect_ready) {
      return res.status(400).json({ error: 'This vendor is not set up to take online payments yet.' })
    }

    const amount = Math.round(Number(order.total) * 100)
    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Order total is too low to charge online.' })
    }

    const currency = (r.currency || 'CAD').toLowerCase()
    const origin = req.headers.origin || `https://${req.headers.host}`

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amount,
              product_data: {
                name: `${r.name || 'Order'}${order.customer_name ? ` — ${order.customer_name}` : ''}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: { order_id: order.id },
        payment_intent_data: { metadata: { order_id: order.id } },
        success_url: `${origin}/r/${order.restaurant_id}/status?paid={CHECKOUT_SESSION_ID}&order=${order.id}`,
        cancel_url: `${origin}/r/${order.restaurant_id}?canceled=1`,
      },
      { stripeAccount: r.stripe_connect_account_id },
    )

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('pay-order error:', err)
    return res.status(500).json({ error: err.message })
  }
}
