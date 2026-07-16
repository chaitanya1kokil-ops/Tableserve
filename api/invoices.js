import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Returns the restaurant's recent invoices for the in-app payment history.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(200).json({ invoices: [] })

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
    if (!r?.stripe_customer_id) return res.status(200).json({ invoices: [] })

    const list = await stripe.invoices.list({ customer: r.stripe_customer_id, limit: 12 })
    const invoices = list.data.map((i) => ({
      id: i.id,
      number: i.number,
      created: i.created,
      amount: i.amount_paid || i.amount_due || i.total || 0,
      currency: i.currency,
      status: i.status,
      pdf: i.invoice_pdf,
      url: i.hosted_invoice_url,
    }))
    return res.status(200).json({ invoices })
  } catch (err) {
    console.error('invoices error:', err)
    return res.status(500).json({ error: err.message })
  }
}
