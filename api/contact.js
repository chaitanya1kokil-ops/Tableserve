import { createClient } from '@supabase/supabase-js'

// Contact-form submissions from the landing page.
//
// The message is ALWAYS stored first, then emailed. If the mail provider is
// unconfigured, rate-limited or down, the enquiry is still in the database and
// visible in the admin console — a missing API key must never lose a customer.
//
// Delivery uses Resend's REST API directly (no SDK, no new dependency).

const TO = process.env.CONTACT_TO || 'chaitanya@tableserve.ca'
// Resend requires a verified sender domain. Until tableserve.ca is verified,
// their shared onboarding sender works but only delivers to the account owner.
const FROM = process.env.CONTACT_FROM || 'TableServe <onboarding@resend.dev>'

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, message } = req.body || {}
  const cleanEmail = String(email || '').trim()
  const cleanMessage = String(message || '').trim()
  const cleanName = String(name || '').trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (!cleanMessage) return res.status(400).json({ error: 'Please write a message.' })
  if (cleanMessage.length > 4000) {
    return res.status(400).json({ error: 'That message is too long — 4000 characters max.' })
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return res.status(500).json({ error: 'Contact is not configured on this deployment.' })
  }

  // ---- 1. store (the durable record) ---------------------------------------
  const admin = createClient(url, serviceKey)
  const { error: dbErr } = await admin
    .from('contact_messages')
    .insert({ name: cleanName || null, email: cleanEmail, message: cleanMessage })

  if (dbErr) {
    // The per-address hourly cap is a trigger, so it surfaces here.
    if (/Too many messages/i.test(dbErr.message)) {
      return res.status(429).json({ error: 'You’ve sent a few already — try again in an hour.' })
    }
    console.error('contact: insert failed', dbErr)
    return res.status(500).json({ error: 'That didn’t send. Please try again.' })
  }

  // ---- 2. email (best effort) ----------------------------------------------
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Saved, not sent. The admin console is the fallback inbox.
    return res.status(200).json({ ok: true, emailed: false })
  }

  try {
    const subject = `New enquiry from ${cleanName || cleanEmail}`
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        // Hitting reply in the mail client answers the customer, not us.
        reply_to: cleanEmail,
        subject,
        text: [
          `From: ${cleanName || '(no name given)'} <${cleanEmail}>`,
          '',
          cleanMessage,
          '',
          '— sent from the TableServe contact form',
        ].join('\n'),
        html: `
          <p style="margin:0 0 4px"><strong>${escapeHtml(cleanName || 'No name given')}</strong></p>
          <p style="margin:0 0 16px"><a href="mailto:${escapeHtml(cleanEmail)}">${escapeHtml(cleanEmail)}</a></p>
          <div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(cleanMessage)}</div>
          <p style="margin-top:24px;color:#888;font-size:12px">Sent from the TableServe contact form.</p>
        `,
      }),
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('contact: resend failed', resp.status, detail)
      // Stored but not delivered — still a success for the visitor.
      return res.status(200).json({ ok: true, emailed: false })
    }
    return res.status(200).json({ ok: true, emailed: true })
  } catch (err) {
    console.error('contact: resend threw', err)
    return res.status(200).json({ ok: true, emailed: false })
  }
}
