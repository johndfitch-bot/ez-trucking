// Supabase Edge Function: notify-status
// Notifies the client by SMS whenever Eric updates load status.
// Trigger: database webhook on status_history INSERT.
//
// SAFETY: NOTIFICATIONS_ENABLED gates ALL outbound traffic. Default is "false".
// Production must explicitly set NOTIFICATIONS_ENABLED=true. UAT/preview/dev
// environments leave it unset and the function logs intent but sends nothing.
//
// Env required when enabled:
//   NOTIFICATIONS_ENABLED=true        (kill switch)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, SITE_URL,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTIFY = (Deno.env.get('NOTIFICATIONS_ENABLED') ?? 'false').toLowerCase() === 'true'
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') ?? ''
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://eztruckingllc.com'
const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CLIENT_COPY: Record<string, string> = {
  reviewing: 'Eric is reviewing your load.',
  quoted: 'A quote is on the way from Eric.',
  accepted: 'Your load is booked with EZ Trucking.',
  scheduled: 'Pickup is scheduled. Eric will call before arrival.',
  en_route_pickup: 'Eric is on the way to pickup.',
  loaded: 'Load is secured on the truck.',
  en_route_delivery: 'In transit to delivery.',
  delivered: 'Delivered! Photo proof in your tracking page.',
  closed: 'Job complete - thanks for choosing EZ.',
  declined: 'Eric could not take this one. He will be in touch about alternatives.',
}

async function sendSMS(to: string, body: string) {
  if (!NOTIFY) {
    console.log(`[dry-run] SMS to=${to} body="${body.replace(/\n/g, ' | ')}"`)
    return { skipped: true, reason: 'notifications_disabled' }
  }
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || !to) return { skipped: true }
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
  return { ok: res.ok, status: res.status }
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const payload: any = await req.json()
  const row = payload?.record ?? payload
  if (!row?.quote_id || !row?.to_status) return new Response('skip', { status: 204 })

  const copy = CLIENT_COPY[row.to_status]
  if (!copy) return new Response(JSON.stringify({ skipped: true, reason: 'no_copy' }))

  const sb = createClient(SB_URL, SB_KEY)
  const { data: quote } = await sb.from('quotes')
    .select('client_phone,client_name,token,pickup_city,delivery_city')
    .eq('id', row.quote_id)
    .single()
  if (!quote?.client_phone) return new Response(JSON.stringify({ skipped: true, reason: 'no_phone' }))

  const trackUrl = `${SITE_URL}/track/${quote.token}`
  const body = `EZ Trucking: ${copy}\nLoad ${quote.pickup_city}->${quote.delivery_city}\nTrack: ${trackUrl}`
  const smsRes = await sendSMS(quote.client_phone, body)
  return new Response(JSON.stringify({ ok: true, dry_run: !NOTIFY, smsRes }), { headers: { 'content-type': 'application/json' } })
})
