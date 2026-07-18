import { createClient } from '@supabase/supabase-js'
import { buildReceiptText } from '../src/lib/receipt.js'

// Push a kitchen ticket to a printer via the restaurant's own PrintNode account.
// Two callers:
//   * Owner "Send test print" button:  { restaurantId, token, test: true }
//   * Supabase DB webhook on new order: { record: <order row> }
//        + header  x-webhook-secret: <PRINT_WEBHOOK_SECRET>
// The atomic printed_at claim means even if the webhook fires more than once,
// an order prints only once.

function service() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// ESC/POS: init + text + full cut — raw bytes PrintNode sends straight to the printer.
function escpos(text) {
  return Buffer.concat([
    Buffer.from('\x1b\x40', 'binary'), // initialize
    Buffer.from(text, 'utf8'),
    Buffer.from('\x1d\x56\x00', 'binary'), // full cut
  ]).toString('base64')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ skip: true })
  const supabase = service()

  const body = req.body || {}
  const record = body.record || null
  const restaurantId = body.restaurantId || record?.restaurant_id
  if (!restaurantId) return res.status(400).json({ error: 'Missing restaurant' })

  const { data: settings } = await supabase
    .from('printer_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  if (!settings || !settings.enabled || settings.provider !== 'printnode') {
    return res.status(200).json({ skip: 'printnode-not-enabled' })
  }

  // Auth: test print proves it knows the restaurant's token; the webhook proves
  // it knows the global webhook secret.
  const webhookOk =
    process.env.PRINT_WEBHOOK_SECRET &&
    req.headers['x-webhook-secret'] === process.env.PRINT_WEBHOOK_SECRET
  if (body.test) {
    if (body.token !== settings.token) return res.status(401).json({ error: 'Bad token' })
  } else if (!webhookOk) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: r } = await supabase
    .from('restaurants')
    .select('name, currency')
    .eq('id', restaurantId)
    .maybeSingle()

  // Resolve the order (a fake ticket for tests; a claimed real order otherwise).
  let order
  if (body.test) {
    order = {
      id: 'TEST-' + Date.now(),
      created_at: new Date().toISOString(),
      customer_name: 'Test ticket',
      items: [{ quantity: 1, name_snapshot: 'Test item', selected_options: [] }],
      notes: 'If you can read this, printing works.',
      total: 0,
    }
  } else {
    if (record?.status && record.status !== 'new') return res.status(200).json({ skip: 'not-new' })
    const { data: claimed } = await supabase
      .from('orders')
      .update({ printed_at: new Date().toISOString() })
      .eq('id', record.id)
      .is('printed_at', null)
      .select('*, items:order_items(*), table:tables(label)')
      .maybeSingle()
    if (!claimed) return res.status(200).json({ skip: 'already-printed' })
    order = claimed
  }

  const resp = await fetch('https://api.printnode.com/printjobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(settings.printnode_api_key + ':').toString('base64'),
    },
    body: JSON.stringify({
      printerId: Number(settings.printnode_printer_id),
      title: (r?.name || 'TableServe') + ' order',
      contentType: 'raw_base64',
      content: escpos(buildReceiptText(order, r)),
      source: 'TableServe',
    }),
  })

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    // Un-claim so a retry can print it.
    if (!body.test) {
      await supabase.from('orders').update({ printed_at: null }).eq('id', order.id)
    }
    return res.status(502).json({ error: 'PrintNode rejected the job', detail: detail.slice(0, 300) })
  }

  return res.status(200).json({ ok: true })
}
