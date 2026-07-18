import { createClient } from '@supabase/supabase-js'
import { buildReceiptText } from '../src/lib/receipt.js'
import { allowsPrinting } from '../src/lib/constants.js'

// Star CloudPRNT endpoint. The printer is configured (in its own web UI) with
// this URL as its "Server URL", including its restaurant + token:
//   https://<app>/api/cloudprnt?rid=<restaurantId>&k=<token>
// The printer then drives the exchange itself:
//   POST   = poll ("any job for me?")  -> { jobReady, jobToken }
//   GET     = fetch the ticket content -> text/plain (we claim it here)
//   DELETE  = acknowledge the print    -> { }
// No browser or PC required — the printer does all of this over wifi/LTE.

const RECENT_MS = 30 * 60 * 1000 // ignore anything older than 30 min (no backlog dumps)

function service() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// Validate the URL's rid + token against the restaurant's CloudPRNT settings.
async function settingsFor(supabase, req) {
  const rid = req.query.rid
  const token = req.query.k
  if (!rid || !token) return null
  const { data } = await supabase
    .from('printer_settings')
    .select('restaurant_id, enabled, provider, token, restaurant:restaurants(plan, business_type)')
    .eq('restaurant_id', rid)
    .maybeSingle()
  if (!data || !data.enabled || data.provider !== 'cloudprnt' || data.token !== token) return null
  if (!allowsPrinting(data.restaurant)) return null // plan no longer includes printing
  return data
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ jobReady: false })
  const supabase = service()
  const settings = await settingsFor(supabase, req)

  // ---- poll ---------------------------------------------------------------
  if (req.method === 'POST') {
    if (!settings) return res.status(200).json({ jobReady: false })
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', settings.restaurant_id)
      .eq('status', 'new')
      .is('printed_at', null)
      .gt('created_at', new Date(Date.now() - RECENT_MS).toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!order) return res.status(200).json({ jobReady: false })
    return res.status(200).json({ jobReady: true, mediaTypes: ['text/plain'], jobToken: order.id })
  }

  // ---- fetch job content --------------------------------------------------
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    if (!settings) return res.status(200).send('')

    // Prefer the token the poll handed back; fall back to the oldest unprinted.
    let order = null
    if (req.query.token) {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), table:tables(label)')
        .eq('id', req.query.token)
        .eq('restaurant_id', settings.restaurant_id)
        .maybeSingle()
      order = data
    }
    if (!order) {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), table:tables(label)')
        .eq('restaurant_id', settings.restaurant_id)
        .eq('status', 'new')
        .is('printed_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      order = data
    }
    if (!order) return res.status(200).send('')

    // Claim it so it never prints twice.
    await supabase
      .from('orders')
      .update({ printed_at: new Date().toISOString() })
      .eq('id', order.id)
      .is('printed_at', null)

    const { data: r } = await supabase
      .from('restaurants')
      .select('name, currency')
      .eq('id', settings.restaurant_id)
      .maybeSingle()

    return res.status(200).send(buildReceiptText(order, r))
  }

  // ---- acknowledge --------------------------------------------------------
  if (req.method === 'DELETE') return res.status(200).json({ ok: true })

  return res.status(405).json({ error: 'Method not allowed' })
}
