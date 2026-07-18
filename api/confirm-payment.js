import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Called when the customer returns from Stripe Checkout (success_url). Verifies
// with Stripe that the session was actually paid, that it belongs to this order,
// and that the amount matches — then flips the order 'awaiting_payment' -> 'new'
// so it appears on the kitchen/truck board. Idempotent and safe to call twice.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(400).json({ error: 'Payments are not configured.' })

  const stripe = new Stripe(secret)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  try {
    const { orderId, sessionId } = req.body || {}
    if (!orderId || !sessionId) return res.status(400).json({ error: 'Missing order or session' })

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, total, restaurant:restaurants(stripe_connect_account_id)')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return res.status(404).json({ error: 'Order not found' })
    // Already released (paid earlier, or double call) — treat as success.
    if (order.status !== 'awaiting_payment') return res.status(200).json({ paid: true })

    const acct = order.restaurant?.stripe_connect_account_id
    if (!acct) return res.status(400).json({ error: 'Vendor not connected.' })

    const session = await stripe.checkout.sessions.retrieve(sessionId, { stripeAccount: acct })

    if (session?.metadata?.order_id !== orderId) {
      return res.status(400).json({ error: 'Payment does not match this order.' })
    }
    if (session?.payment_status !== 'paid') {
      return res.status(200).json({ paid: false })
    }
    if (Number(session.amount_total) !== Math.round(Number(order.total) * 100)) {
      return res.status(400).json({ error: 'Paid amount does not match the order.' })
    }

    // Release to the kitchen. Guarded so it only fires while still awaiting.
    await supabase
      .from('orders')
      .update({ status: 'new' })
      .eq('id', orderId)
      .eq('status', 'awaiting_payment')

    return res.status(200).json({ paid: true })
  } catch (err) {
    console.error('confirm-payment error:', err)
    return res.status(500).json({ error: err.message })
  }
}
