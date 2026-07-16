import { createClient } from '@supabase/supabase-js'

// Temporary diagnostic: checks billing env presence + whether the service-role
// key can actually READ and WRITE the restaurants table. No secret values are
// ever returned. Pass ?rid=<restaurantId> to test a real (reverted) write.
// Safe to delete once billing is confirmed.
export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const out = {
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY_present: !!key,
    SUPABASE_URL_present: !!url,
  }
  try {
    const sb = createClient(url, key)
    const rid = req.query?.rid
    if (rid) {
      const { error: wErr } = await sb
        .from('restaurants')
        .update({ stripe_customer_id: 'hc_test' })
        .eq('id', rid)
      if (wErr) {
        out.dbWrite = `ERROR: ${wErr.message}`
      } else {
        const { data } = await sb.from('restaurants').select('stripe_customer_id').eq('id', rid).single()
        out.dbWrite = data?.stripe_customer_id === 'hc_test' ? 'OK (service role can write)' : 'FAILED (write silently dropped — not service role)'
        await sb.from('restaurants').update({ stripe_customer_id: null }).eq('id', rid) // revert
      }
    }
  } catch (e) {
    out.dbException = e.message
  }
  res.status(200).json(out)
}
