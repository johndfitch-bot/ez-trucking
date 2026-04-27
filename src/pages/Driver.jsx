import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageCircle, MapPin, Truck, XCircle, Send, Camera, LogOut, Clock, ChevronRight, Wifi, WifiOff, DollarSign } from 'lucide-react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { useAvailability } from '../hooks/useAvailability'
import { supabase, supabaseReady } from '../lib/supabase'
import { STATUS_BY_ID, STATUS_FLOW, isTerminal } from '../lib/tracking'
import styles from './Driver.module.css'

const NEXT_STATUS = {
  new: 'reviewing',
  reviewing: 'accepted',
  quoted: 'accepted',
  accepted: 'scheduled',
  scheduled: 'en_route_pickup',
  en_route_pickup: 'loaded',
  loaded: 'en_route_delivery',
  en_route_delivery: 'delivered',
}

const NEXT_LABEL = {
  new: 'Start reviewing',
  reviewing: 'Accept load',
  quoted: 'Mark accepted',
  accepted: 'Schedule',
  scheduled: 'Head to pickup',
  en_route_pickup: 'Loaded',
  loaded: 'Start delivery',
  en_route_delivery: 'Mark delivered',
}

const QUICK_SMS = [
  { label: 'On way — 30 min', body: 'Eric: on the way, about 30 min out.' },
  { label: 'Loaded & rolling', body: 'Eric: loaded up and rolling now.' },
  { label: 'Traffic delay', body: 'Eric: traffic delay, updating ETA shortly.' },
  { label: 'Delivered', body: 'Eric: load delivered. Photo proof on your tracking page.' },
]

function formatAge(ts) {
  if (!ts) return ''
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

export default function Driver() {
  const { user, signIn, signOut, loading } = useSupabaseAuth()
  const { status: avail, setStatus: setAvail } = useAvailability()
  const [online, setOnline] = useState(navigator.onLine)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [quotes, setQuotes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  const signInHandler = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setErr(error.message || 'Sign in failed.')
  }

  useEffect(() => {
    if (!user || !supabaseReady) return
    let alive = true
    supabase.from('quotes').select('*').not('status', 'in', '("closed","declined")').order('created_at', { ascending: true }).then(({ data }) => {
      if (alive) setQuotes(data || [])
    })
    const channel = supabase.channel('driver-quotes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (p) => {
        if (p.eventType === 'INSERT') setQuotes((prev) => [...prev, p.new])
        if (p.eventType === 'UPDATE') setQuotes((prev) => prev.map((q) => q.id === p.new.id ? p.new : q))
        if (p.eventType === 'DELETE') setQuotes((prev) => prev.filter((q) => q.id !== p.old.id))
      })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    if (!activeId) return
    let alive = true
    supabase.from('messages').select('*').eq('quote_id', activeId).order('at', { ascending: true }).then(({ data }) => {
      if (alive) setMessages(data || [])
    })
    const channel = supabase.channel(`driver-msgs-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `quote_id=eq.${activeId}` }, (p) => setMessages((prev) => [...prev, p.new]))
      .subscribe()
    return () => { alive = false; setMessages([]); supabase.removeChannel(channel) }
  }, [activeId])

  const active = quotes.find((q) => q.id === activeId)

  const open = useMemo(() => quotes.filter((q) => !isTerminal(q.status)), [quotes])
  const newCount = useMemo(() => open.filter((q) => q.status === 'new').length, [open])

  const advance = async () => {
    if (!active) return
    const next = NEXT_STATUS[active.status]
    if (!next) return
    const patch = { status: next }
    if (next === 'delivered') patch.delivered_at = new Date().toISOString()
    await supabase.from('quotes').update(patch).eq('id', active.id)
  }

  const decline = async () => {
    if (!active) return
    if (!confirm(`Decline ${active.pickup_city} → ${active.delivery_city}?`)) return
    await supabase.from('quotes').update({ status: 'declined' }).eq('id', active.id)
  }

  const uploadPod = async (file) => {
    if (!file || !active) return
    const stamp = new Date().valueOf()
    const path = `pod/${active.token}/${stamp}-${file.name}`.replace(/\s+/g, '_')
    const { error: upErr } = await supabase.storage.from('pod').upload(path, file, { upsert: false })
    if (upErr) { alert('Upload failed: ' + upErr.message); return }
    const { data: pub } = supabase.storage.from('pod').getPublicUrl(path)
    await supabase.from('quotes').update({ pod_photo_url: pub.publicUrl, status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', active.id)
  }

  const sendMsg = async (body) => {
    const text = (body ?? draft).trim()
    if (!text || !active) return
    setDraft('')
    await supabase.from('messages').insert({ quote_id: active.id, sender: 'eric', body: text })
  }

  const savePrice = async (val) => {
    const [lo, hi] = String(val).split('-').map((v) => Number(v.trim()))
    if (!lo || !active) return
    await supabase.from('quotes').update({ quoted_low: lo, quoted_high: hi || lo, status: active.status === 'new' || active.status === 'reviewing' ? 'quoted' : active.status }).eq('id', active.id)
  }

  if (!supabaseReady) {
    return (
      <main className={styles.main}>
        <section className={styles.signInCard}>
          <h1>Driver cockpit</h1>
          <p>Set up Supabase first — see supabase/README.md.</p>
        </section>
      </main>
    )
  }

  if (loading) return <main className={styles.main}><p className={styles.loading}>Starting up…</p></main>

  if (!user) {
    return (
      <main className={styles.main}>
        <motion.section className={styles.signInCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.brand}>EZ <small>Driver cockpit</small></div>
          <form onSubmit={signInHandler} className={styles.signInForm}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            {err && <p className={styles.err}>{err}</p>}
          </form>
        </motion.section>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <span className={styles.logo}>EZ</span>
          <span className={styles.topTitle}>Driver</span>
        </div>
        <div className={styles.topRight}>
          <span className={styles.onlineChip} data-online={online}>
            {online ? <Wifi size={14} aria-hidden /> : <WifiOff size={14} aria-hidden />}
            {online ? 'Online' : 'Offline'}
          </span>
          <button type="button" onClick={signOut} className={styles.logoutBtn} aria-label="Sign out">
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      <section className={styles.availStrip}>
        {['available', 'limited', 'booked', 'off'].map((s) => (
          <button key={s} type="button" data-selected={avail === s} onClick={() => setAvail(s)}>{s}</button>
        ))}
      </section>

      <section className={styles.queueSection}>
        <div className={styles.queueHead}>
          <h2>Today's queue</h2>
          <span className={styles.badge}>{newCount} NEW · {open.length} open</span>
        </div>
        {open.length === 0 && <p className={styles.emptyQueue}>No active loads. Hit the road or take a nap.</p>}
        <ul className={styles.queueList}>
          {open.map((q) => (
            <li key={q.id}>
              <button type="button" className={styles.queueItem} data-active={activeId === q.id} data-urgent={q.status === 'new'} onClick={() => setActiveId(q.id)}>
                <div className={styles.queueItemLeft}>
                  <strong>{q.pickup_city} → {q.delivery_city}</strong>
                  <span>{q.load_type} · {q.client_name}</span>
                </div>
                <div className={styles.queueItemRight}>
                  <span className={styles.statusChip} data-color={STATUS_BY_ID[q.status]?.color}>{STATUS_BY_ID[q.status]?.label || q.status}</span>
                  <span className={styles.age}><Clock size={10} aria-hidden />{formatAge(q.created_at)}</span>
                </div>
                <ChevronRight size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <AnimatePresence>
        {active && (
          <motion.section
            key={active.id}
            className={styles.active}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
          >
            <div className={styles.activeHead}>
              <div>
                <code>{active.token}</code>
                <h3>{active.pickup_city} → {active.delivery_city}</h3>
                <p>{active.load_type}{active.load_size ? ` · ${active.load_size}` : ''}{active.weight ? ` · ${active.weight}` : ''}</p>
              </div>
              <span className={styles.statusChip} data-color={STATUS_BY_ID[active.status]?.color}>{STATUS_BY_ID[active.status]?.label}</span>
            </div>

            <div className={styles.clientCard}>
              <div>
                <span>Client</span>
                <strong>{active.client_name}</strong>
              </div>
              <div className={styles.clientButtons}>
                <a href={`tel:${active.client_phone}`} className={styles.bigCall}><Phone size={18} aria-hidden />Call</a>
                <a href={`sms:${active.client_phone}`} className={styles.bigTxt}><MessageCircle size={18} aria-hidden />SMS</a>
              </div>
            </div>

            <div className={styles.tripCard}>
              <div><MapPin size={14} aria-hidden /><span>Pickup</span><strong>{active.pickup_city}</strong></div>
              <div><MapPin size={14} aria-hidden /><span>Delivery</span><strong>{active.delivery_city}</strong></div>
              <div><Truck size={14} aria-hidden /><span>Miles</span><strong>{active.miles_estimate ? `~${active.miles_estimate}` : '—'}</strong></div>
              <div><DollarSign size={14} aria-hidden /><span>Quote</span><strong>{active.quoted_low ? `$${active.quoted_low} – $${active.quoted_high || active.quoted_low}` : '—'}</strong></div>
              {active.notes && <div className={styles.tripNotes}><span>Notes</span><strong>{active.notes}</strong></div>}
              {active.special?.length ? <div className={styles.tripNotes}><span>Special</span><strong>{active.special.join(' · ')}</strong></div> : null}
            </div>

            {active.quoted_low == null && (
              <PriceForm onSave={savePrice} />
            )}

            <div className={styles.actionRow}>
              {NEXT_STATUS[active.status] && (
                <button type="button" className={styles.advanceBtn} onClick={advance}>
                  {NEXT_LABEL[active.status]}
                  <ChevronRight size={18} aria-hidden />
                </button>
              )}
              {active.status !== 'declined' && (
                <button type="button" className={styles.declineBtn} onClick={decline}>
                  <XCircle size={16} aria-hidden />Decline
                </button>
              )}
            </div>

            <label className={styles.podBtn}>
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => uploadPod(e.target.files?.[0])} />
              <Camera size={18} aria-hidden />
              {active.pod_photo_url ? 'Upload another POD photo' : 'Snap POD photo'}
            </label>

            <div className={styles.msgBox}>
              <h4>Chat</h4>
              <div className={styles.msgScroll}>
                {messages.length === 0 && <p className={styles.noMsg}>No messages yet.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={styles.msg} data-me={m.sender === 'eric'}>
                    <p>{m.body}</p>
                    <time>{formatAge(m.at)}</time>
                  </div>
                ))}
              </div>
              <div className={styles.quickRow}>
                {QUICK_SMS.map((q) => (
                  <button key={q.label} type="button" onClick={() => sendMsg(q.body)}>{q.label}</button>
                ))}
              </div>
              <div className={styles.msgCompose}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMsg() } }} />
                <button type="button" onClick={() => sendMsg()}><Send size={16} aria-hidden /></button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  )
}

function PriceForm({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div className={styles.priceBox}>
      <DollarSign size={16} aria-hidden />
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Quote (e.g. 650 or 600-700)" inputMode="numeric" />
      <button type="button" onClick={() => { onSave(val); setVal('') }}>Send quote</button>
    </div>
  )
}
