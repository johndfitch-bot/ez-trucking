// Supabase Edge Function: notify-eric
// Sends SMS + email to Eric whenever a new quote row is inserted.
// Trigger: database webhook → POST body = row payload.
// Env required:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, ERIC_PHONE
//   RESEND_API_KEY (optional, for email)
//   ERIC_EMAIL (default 1haytrucker1@gmail.com)
//   SITE_URL  (e.g. https://eztrucking.example)

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') ?? ''
const ERIC_PHONE = Deno.env.get('ERIC_PHONE') ?? '+19167186977'
const RESEND = Deno.env.get('RESEND_API_KEY') ?? ''
const ERIC_EMAIL = Deno.env.get('ERIC_EMAIL') ?? '1haytrucker1@gmail.com'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://eztruckingllc.com'

async function sendSMS(to: string, body: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return { skipped: true, reason: 'twilio_not_configured' }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  const form = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })
  return { ok: res.ok, status: res.status, text: await res.text() }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND) return { skipped: true, reason: 'resend_not_configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EZ Trucking <alerts@eztruckingllc.com>',
      to: [to],
      subject,
      html,
    }),
  })
  return { ok: res.ok, status: res.status, text: await res.text() }
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  let payload: any
  try { payload = await req.json() } catch { return new Response('bad json', { status: 400 }) }

  const row = payload?.record ?? payload
  const isInsert = (payload?.type ?? 'INSERT') === 'INSERT'
  if (!row?.token) return new Response('no row', { status: 204 })

  const trackUrl = `${SITE_URL}/track/${row.token}`
  const driverUrl = `${SITE_URL}/driver`

  if (isInsert) {
    const smsBody = `EZ: NEW LOAD\n${row.load_type} ${row.pickup_city}→${row.delivery_city}\n${row.client_name} ${row.client_phone}\nNeed: ${row.needed_on ?? 'ASAP'}\nOpen: ${driverUrl}`
    const smsRes = await sendSMS(ERIC_PHONE, smsBody)

    const html = `
      <div style="font-family:system-ui;max-width:520px">
        <h2 style="color:#f97316">New Load Request</h2>
        <p><b>${row.client_name}</b> — ${row.client_phone} ${row.client_email ? `· ${row.client_email}` : ''}</p>
        <p><b>${row.load_type}</b> · ${row.pickup_city} → ${row.delivery_city}</p>
        <p>Load size: ${row.load_size ?? '—'} · Weight: ${row.weight ?? '—'}</p>
        <p>Need by: ${row.needed_on ?? 'ASAP'}</p>
        <p>Notes: ${row.notes ?? '—'}</p>
        <p><a href="${driverUrl}" style="background:#f97316;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">Open driver cockpit</a></p>
        <p style="color:#64748b;font-size:12px">Client tracking: ${trackUrl}</p>
      </div>`
    const emailRes = await sendEmail(ERIC_EMAIL, `EZ load · ${row.pickup_city} → ${row.delivery_city}`, html)

    // Confirmation SMS to client
    if (row.client_phone) {
      await sendSMS(row.client_phone, `EZ Trucking: got your load request (${row.pickup_city}→${row.delivery_city}). Track: ${trackUrl}`)
    }

    return new Response(JSON.stringify({ ok: true, smsRes, emailRes }), { headers: { 'content-type': 'application/json' } })
  }

  return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { 'content-type': 'application/json' } })
})
