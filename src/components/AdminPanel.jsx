import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, LogOut, Truck, Clock, CalendarX, Radio, Phone, MessageCircle, Inbox, CheckCircle2, XCircle, DollarSign, Send, RefreshCw, Search, AlertCircle, Camera, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAvailability } from '../hooks/useAvailability'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { supabase, supabaseReady } from '../lib/supabase'
import { STATUS_FLOW, STATUS_BY_ID, isTerminal } from '../lib/tracking'
import styles from './AdminPanel.module.css'

const AVAILABILITY = [
  { id: 'available', label: 'Available', icon: Truck, color: 'green' },
  { id: 'limited', label: 'Limited', icon: Clock, color: 'yellow' },
  { id: 'booked', label: 'Booked', icon: CalendarX, color: 'red' },
  { id: 'off', label: 'Off duty', icon: Radio, color: 'red' },
]

const QUICK_REPLIES = [
  'On my way — be there in about 30 minutes.',
  'Loaded up and rolling.',
  'Traffic delay — adjusting ETA, will update.',
  'Delivered. Photo proof uploaded to your tracking page.',
  'Quote ready — check your phone for details.',
]

function formatWhen(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const sec = Math.round((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return d.toLocaleDateString()
}

function StatusPill({ status }) {
  const info = STATUS_BY_ID[status] || { label: status, color: 'slate' }
  return <span className={styles.statusPill} data-color={info.color}>{info.label}</span>
}

function LoginGate({ onPin, pinLoading, message, pinValue, setPinValue, onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const handleEmail = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await onSignIn(email, password)
    setBusy(false)
    if (error) setErr(error.message || 'Sign-in failed.')
  }
  return (
    <motion.section className={styles.section} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.gate}>
        <Lock className={styles.lockIcon} size={40} aria-hidden />
        <h2 className={styles.gateTitle}>Admin access</h2>
        {supabaseReady ? (
          <form onSubmit={handleEmail} className={styles.gateForm}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.pinInput} autoComplete="email" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.pinInput} autoComplete="current-password" />
            <button type="submit" className={styles.gateBtn} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            {err && <p className={styles.gateError}>{err}</p>}
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onPin() }} className={styles.gateForm}>
            <input type="password" placeholder="PIN" value={pinValue} onChange={(e) => setPinValue(e.target.value)} className={styles.pinInput} aria-label="PIN" autoComplete="off" />
            <button type="submit" className={styles.gateBtn} disabled={pinLoading}>Enter</button>
            {message && <p className={styles.gateError}>{message}</p>}
            <p className={styles.gateNote}>Supabase not configured — falling back to local PIN.</p>
          </form>
        )}
      </div>
    </motion.section>
  )
}

function QueueCard({ quote, selected, onSelect }) {
  const age = formatWhen(quote.created_at)
  return (
    <button className={styles.queueCard} data-selected={selected} onClick={() => onSelect(quote.id)}>
      <div className={styles.queueCardTop}>
        <StatusPill status={quote.status} />
        <span className={styles.queueAge}>{age}</span>
      </div>
      <div className={styles.queueCardBody}>
        <strong>{quote.pickup_city} → {quote.delivery_city}</strong>
        <span>{quote.load_type} · {quote.client_name}</span>
      </div>
      <div className={styles.queueCardFoot}>
        <span>{quote.client_phone}</span>
        {quote.miles_estimate ? <span>{quote.miles_estimate} mi</span> : null}
      </div>
    </button>
  )
}

function Detail({ quote, onChange, onDelete }) {
  const [savingStatus, setSavingStatus] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [priceDraft, setPriceDraft] = useState('')
  const [podUploading, setPodUploading] = useState(false)

  useEffect(() => {
    if (!quote?.id) return
    let alive = true
    supabase.from('messages').select('*').eq('quote_id', quote.id).order('at', { ascending: true }).then(({ data }) => {
      if (alive) setMessages(data || [])
    })
    const channel = supabase.channel(`admin-msg:${quote.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `quote_id=eq.${quote.id}` }, (p) => setMessages((prev) => [...prev, p.new]))
      .subscribe()
    return () => { alive = false; supabase.removeChannel(channel) }
  }, [quote?.id])

  const updateStatus = async (next) => {
    setSavingStatus(true)
    const patch = { status: next }
    if (next === 'delivered') patch.delivered_at = new Date().toISOString()
    await supabase.from('quotes').update(patch).eq('id', quote.id)
    onChange({ ...quote, ...patch })
    setSavingStatus(false)
  }

  const saveQuotedPrice = async () => {
    const [lo, hi] = priceDraft.split('-').map((v) => Number(v.trim()))
    if (!lo) return
    const patch = { quoted_low: lo, quoted_high: hi || lo, status: quote.status === 'new' ? 'quoted' : quote.status }
    await supabase.from('quotes').update(patch).eq('id', quote.id)
    onChange({ ...quote, ...patch })
    setPriceDraft('')
  }

  const sendMessage = async (body) => {
    const text = (body ?? draft).trim()
    if (!text) return
    setDraft('')
    await supabase.from('messages').insert({ quote_id: quote.id, sender: 'eric', body: text, channel: 'web' })
  }

  const uploadPod = async (file) => {
    if (!file) return
    setPodUploading(true)
    const path = `pod/${quote.token}/${Date.now()}-${file.name}`.replace(/\s+/g, '_')
    const { error: upErr } = await supabase.storage.from('pod').upload(path, file, { upsert: false })
    if (upErr) { alert('Upload failed: ' + upErr.message); setPodUploading(false); return }
    const { data: pub } = supabase.storage.from('pod').getPublicUrl(path)
    const url = pub.publicUrl
    await supabase.from('quotes').update({ pod_photo_url: url, status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', quote.id)
    onChange({ ...quote, pod_photo_url: url, status: 'delivered' })
    setPodUploading(false)
  }

  if (!quote) return <div className={styles.empty}><Inbox size={48} aria-hidden /><p>Select a load from the queue.</p></div>

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <div>
          <span className={styles.token}>{quote.token}</span>
          <h3>{quote.pickup_city} → {quote.delivery_city}</h3>
          <p>{quote.load_type}{quote.load_size ? ` · ${quote.load_size}` : ''}{quote.weight ? ` · ${quote.weight}` : ''}</p>
        </div>
        <StatusPill status={quote.status} />
      </div>

      <div className={styles.detailGrid}>
        <div>
          <span>Client</span>
          <strong>{quote.client_name}</strong>
          <div className={styles.detailContactRow}>
            <a href={`tel:${quote.client_phone}`}><Phone size={14} aria-hidden />{quote.client_phone}</a>
            <a href={`sms:${quote.client_phone}`}><MessageCircle size={14} aria-hidden />SMS</a>
            {quote.client_email && <a href={`mailto:${quote.client_email}`}>{quote.client_email}</a>}
          </div>
        </div>
        <div><span>Needed</span><strong>{quote.needed_on || 'ASAP'}</strong></div>
        <div><span>Miles</span><strong>{quote.miles_estimate ? `~${quote.miles_estimate}` : '—'}</strong></div>
        <div><span>Ballpark</span><strong>{quote.quoted_low ? `$${quote.quoted_low.toLocaleString()} – $${(quote.quoted_high || quote.quoted_low).toLocaleString()}` : '—'}</strong></div>
        {quote.special?.length ? <div className={styles.detailFull}><span>Special</span><strong>{quote.special.join(' · ')}</strong></div> : null}
        {quote.notes ? <div className={styles.detailFull}><span>Notes</span><strong>{quote.notes}</strong></div> : null}
      </div>

      <div className={styles.pipeline}>
        {STATUS_FLOW.map((s) => (
          <button key={s.id} type="button" disabled={savingStatus} data-current={quote.status === s.id} onClick={() => updateStatus(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.priceRow}>
        <DollarSign size={16} aria-hidden />
        <input
          type="text"
          placeholder="Enter quoted price (e.g. 650 or 600-700)"
          value={priceDraft}
          onChange={(e) => setPriceDraft(e.target.value)}
        />
        <button type="button" onClick={saveQuotedPrice}>Save quote</button>
      </div>

      <div className={styles.podRow}>
        <label className={styles.podLabel}>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => uploadPod(e.target.files?.[0])} />
          <Upload size={14} aria-hidden /> {podUploading ? 'Uploading…' : 'Upload POD photo'}
        </label>
        {quote.pod_photo_url && <a href={quote.pod_photo_url} target="_blank" rel="noreferrer"><Camera size={14} aria-hidden />View POD</a>}
      </div>

      <div className={styles.msgBlock}>
        <h4>Messages</h4>
        <div className={styles.msgList}>
          {messages.length === 0 && <p className={styles.msgEmpty}>No messages yet.</p>}
          {messages.map((m) => (
            <div key={m.id} className={styles.msgItem} data-sender={m.sender}>
              <span className={styles.msgSender}>{m.sender === 'client' ? quote.client_name : m.sender === 'eric' ? 'Eric' : 'System'}</span>
              <p>{m.body}</p>
              <time>{formatWhen(m.at)}</time>
            </div>
          ))}
        </div>
        <div className={styles.msgQuick}>
          {QUICK_REPLIES.map((q) => (
            <button key={q} type="button" onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
        {!isTerminal(quote.status) && (
          <div className={styles.msgInput}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply to client…"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
            />
            <button type="button" onClick={() => sendMessage()}><Send size={14} aria-hidden />Send</button>
          </div>
        )}
      </div>

      <div className={styles.detailActions}>
        <Link to={`/track/${quote.token}`} target="_blank" className={styles.ghostBtn}>Open client view</Link>
        <button type="button" className={styles.dangerBtn} onClick={() => { if (confirm('Delete this quote?')) onDelete(quote.id) }}>Delete</button>
      </div>
    </div>
  )
}

const PIN = 'EZ2006'

export default function AdminPanel() {
  const { user, signIn, signOut, loading: authLoading } = useSupabaseAuth()
  const { status, setStatus } = useAvailability()
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const unlocked = user || pinUnlocked

  const [quotes, setQuotes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('open')
  const [refreshing, setRefreshing] = useState(false)

  const handlePin = () => {
    if (pinValue === PIN) { setPinUnlocked(true); setPinMessage('') }
    else setPinMessage('Wrong PIN')
  }

  const loadQuotes = async () => {
    if (!supabaseReady) return
    setRefreshing(true)
    const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false }).limit(200)
    if (!error) setQuotes(data || [])
    setRefreshing(false)
  }

  useEffect(() => {
    if (!unlocked || !supabaseReady) return
    queueMicrotask(() => { loadQuotes() })
    const channel = supabase.channel('admin-quotes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (p) => {
        if (p.eventType === 'INSERT') setQuotes((prev) => [p.new, ...prev])
        if (p.eventType === 'UPDATE') setQuotes((prev) => prev.map((q) => q.id === p.new.id ? p.new : q))
        if (p.eventType === 'DELETE') setQuotes((prev) => prev.filter((q) => q.id !== p.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [unlocked])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quotes.filter((row) => {
      if (filter === 'open' && isTerminal(row.status)) return false
      if (filter === 'closed' && !isTerminal(row.status)) return false
      if (q && !(
        row.token.toLowerCase().includes(q) ||
        row.client_name?.toLowerCase().includes(q) ||
        row.client_phone?.toLowerCase().includes(q) ||
        row.pickup_city?.toLowerCase().includes(q) ||
        row.delivery_city?.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [quotes, search, filter])

  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      queueMicrotask(() => setSelectedId(filtered[0].id))
    }
  }, [filtered, selectedId])

  const selected = quotes.find((q) => q.id === selectedId)

  const stats = useMemo(() => ({
    open: quotes.filter((q) => !isTerminal(q.status)).length,
    nu: quotes.filter((q) => q.status === 'new').length,
    today: quotes.filter((q) => {
      const d = new Date(q.created_at)
      const n = new Date()
      return d.toDateString() === n.toDateString()
    }).length,
    revenue: quotes.filter((q) => q.status === 'delivered' || q.status === 'closed').reduce((s, q) => s + Number(q.final_price || q.quoted_high || 0), 0),
  }), [quotes])

  if (authLoading && supabaseReady) {
    return <section className={styles.section}><p className={styles.loading}>Checking session…</p></section>
  }

  if (!unlocked) {
    return <LoginGate onPin={handlePin} pinMessage={pinMessage} pinValue={pinValue} setPinValue={setPinValue} message={pinMessage} onSignIn={signIn} />
  }

  return (
    <motion.section className={styles.cockpit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <header className={styles.cockpitHead}>
        <div>
          <h1>EZ Command</h1>
          <p>Live load queue · {new Date().toLocaleDateString()}</p>
        </div>
        <div className={styles.cockpitStats}>
          <div><span>Open</span><strong>{stats.open}</strong></div>
          <div><span>New</span><strong>{stats.nu}</strong></div>
          <div><span>Today</span><strong>{stats.today}</strong></div>
          <div><span>Billed</span><strong>${Math.round(stats.revenue).toLocaleString()}</strong></div>
        </div>
        <div className={styles.cockpitActions}>
          <button type="button" onClick={loadQuotes} className={styles.iconBtn} aria-label="Refresh" disabled={refreshing}>
            <RefreshCw size={16} aria-hidden className={refreshing ? styles.spinning : undefined} />
          </button>
          {user ? (
            <button type="button" onClick={signOut} className={styles.iconBtn} aria-label="Sign out"><LogOut size={16} aria-hidden /></button>
          ) : (
            <button type="button" onClick={() => setPinUnlocked(false)} className={styles.iconBtn} aria-label="Lock"><Lock size={16} aria-hidden /></button>
          )}
        </div>
      </header>

      <div className={styles.availability}>
        <span className={styles.availabilityLabel}>Availability</span>
        <div className={styles.availabilityGroup}>
          {AVAILABILITY.map((opt) => (
            <button key={opt.id} type="button" data-color={opt.color} data-selected={status === opt.id} onClick={() => setStatus(opt.id)}>
              <opt.icon size={14} aria-hidden />{opt.label}
            </button>
          ))}
        </div>
      </div>

      {!supabaseReady && (
        <div className={styles.warning}><AlertCircle size={16} aria-hidden />Supabase not configured — live queue disabled. Add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env.local.</div>
      )}

      <div className={styles.cockpitBody}>
        <aside className={styles.queue}>
          <div className={styles.queueControls}>
            <div className={styles.searchRow}>
              <Search size={14} aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search token, name, city…" />
            </div>
            <div className={styles.filterRow}>
              {['open', 'all', 'closed'].map((f) => (
                <button key={f} type="button" data-active={filter === f} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className={styles.queueList}>
            {filtered.length === 0 && <p className={styles.queueEmpty}>No loads match.</p>}
            {filtered.map((q) => (
              <QueueCard key={q.id} quote={q} selected={q.id === selectedId} onSelect={setSelectedId} />
            ))}
          </div>
        </aside>
        <section className={styles.detailPane}>
          <Detail
            quote={selected}
            onChange={(next) => setQuotes((prev) => prev.map((q) => q.id === next.id ? { ...q, ...next } : q))}
            onDelete={async (id) => {
              await supabase.from('quotes').delete().eq('id', id)
              setQuotes((prev) => prev.filter((q) => q.id !== id))
              setSelectedId(null)
            }}
          />
        </section>
      </div>
    </motion.section>
  )
}
