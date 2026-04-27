import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, MessageCircle, CheckCircle2, Circle, MapPin, Truck, Clock, ExternalLink, Send, AlertTriangle, Camera } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase, supabaseReady } from '../lib/supabase'
import { STATUS_FLOW, STATUS_BY_ID, statusIndex, isTerminal } from '../lib/tracking'
import styles from './TrackLoad.module.css'

const VISIBLE_STATUSES = STATUS_FLOW.filter((s) => s.id !== 'declined')

function formatWhen(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function TrackLoad() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabaseReady) {
        setError('Tracking not configured. Call Eric at (916) 718-6977.')
        setLoading(false)
        return
      }
      setLoading(true)
      const rpc = await supabase.rpc('get_quote_with_thread', { p_token: token })
      if (!alive) return
      if (!rpc.error && rpc.data?.quote) {
        setQuote(rpc.data.quote)
        setHistory(rpc.data.history || [])
        setMessages(rpc.data.messages || [])
        setLoading(false)
        return
      }
      // Fallback: direct selects (works only against pre-0001 schemas).
      const { data: q, error: qErr } = await supabase.from('quotes').select('*').eq('token', token).maybeSingle()
      if (!alive) return
      if (qErr || !q) {
        setError('Load not found. Double-check the tracking code or call Eric.')
        setLoading(false)
        return
      }
      setQuote(q)
      const [{ data: h }, { data: m }] = await Promise.all([
        supabase.from('status_history').select('*').eq('quote_id', q.id).order('at', { ascending: true }),
        supabase.from('messages').select('*').eq('quote_id', q.id).order('at', { ascending: true }),
      ])
      if (!alive) return
      setHistory(h || [])
      setMessages(m || [])
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [token])

  useEffect(() => {
    if (!supabaseReady || !quote?.id) return
    const channel = supabase.channel(`track:${quote.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `id=eq.${quote.id}` }, (p) => setQuote(p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_history', filter: `quote_id=eq.${quote.id}` }, (p) => setHistory((prev) => [...prev, p.new]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `quote_id=eq.${quote.id}` }, (p) => setMessages((prev) => [...prev, p.new]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [quote?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const currentIdx = useMemo(() => {
    if (!quote) return -1
    return statusIndex(quote.status)
  }, [quote])

  const sendMessage = async () => {
    if (!draft.trim() || !supabaseReady || !quote?.id) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    const { error: msgErr } = await supabase.from('messages').insert({
      quote_id: quote.id, sender: 'client', body, channel: 'web',
    })
    setSending(false)
    if (msgErr) setError('Message failed — try calling Eric.')
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className={styles.main}>
          <p className={styles.loading}>Loading your load…</p>
        </main>
        <Footer />
      </>
    )
  }

  if (error || !quote) {
    return (
      <>
        <Navbar />
        <main className={styles.main}>
          <section className={styles.errorCard}>
            <AlertTriangle size={36} aria-hidden />
            <h1>Can't find that load</h1>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <a href="tel:9167186977" className={styles.primaryBtn}><Phone size={16} aria-hidden />Call Eric</a>
              <Link to="/" className={styles.ghostBtn}>Back home</Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const declined = quote.status === 'declined'
  const delivered = quote.status === 'delivered' || quote.status === 'closed'

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.kicker}>Load tracking</span>
            <code className={styles.token}>{quote.token}</code>
          </div>
          <h1 className={styles.title}>{quote.pickup_city} → {quote.delivery_city}</h1>
          <p className={styles.sub}>{quote.load_type}{quote.load_size ? ` · ${quote.load_size}` : ''}{quote.weight ? ` · ${quote.weight}` : ''}</p>
          <div className={styles.pricePill} data-variant={declined ? 'red' : 'orange'}>
            {declined ? 'Eric could not take this one' : (
              quote.final_price
                ? <>Final: <strong>${Number(quote.final_price).toLocaleString()}</strong></>
                : (quote.quoted_low || quote.quoted_high)
                  ? <>Quoted: <strong>${Number(quote.quoted_low || 0).toLocaleString()} – ${Number(quote.quoted_high || 0).toLocaleString()}</strong></>
                  : <>Quote pending</>
            )}
          </div>
        </section>

        <motion.section
          className={styles.timeline}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <h2>Progress</h2>
          <ol className={styles.steps}>
            {VISIBLE_STATUSES.map((s, i) => {
              const done = i < currentIdx
              const current = i === currentIdx
              const hit = history.find((h) => h.to_status === s.id)
              return (
                <li key={s.id} className={styles.stepItem} data-state={done ? 'done' : current ? 'current' : 'pending'}>
                  <div className={styles.stepIcon}>
                    {done ? <CheckCircle2 size={20} /> : current ? <Truck size={20} /> : <Circle size={20} />}
                  </div>
                  <div className={styles.stepBody}>
                    <span className={styles.stepLabel}>{s.label}</span>
                    <span className={styles.stepCopy}>{current ? s.clientCopy : (hit ? formatWhen(hit.at) : '')}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </motion.section>

        {quote.pod_photo_url && (
          <section className={styles.podCard}>
            <Camera size={20} aria-hidden />
            <div>
              <h3>Proof of delivery</h3>
              <a href={quote.pod_photo_url} target="_blank" rel="noreferrer">Open photo <ExternalLink size={12} aria-hidden /></a>
              {quote.delivered_at && <span>{formatWhen(quote.delivered_at)}</span>}
            </div>
          </section>
        )}

        <section className={styles.chat}>
          <div className={styles.chatHead}>
            <MessageCircle size={18} aria-hidden />
            <h2>Messages with Eric</h2>
          </div>
          <div className={styles.chatBody} ref={scrollRef}>
            {messages.length === 0 && <p className={styles.chatEmpty}>No messages yet. Ask anything — Eric will reply.</p>}
            {messages.map((m) => (
              <div key={m.id} className={styles.msg} data-sender={m.sender}>
                <div className={styles.msgBubble}>{m.body}</div>
                <span className={styles.msgMeta}>{m.sender === 'client' ? 'You' : m.sender === 'eric' ? 'Eric' : 'System'} · {formatWhen(m.at)}</span>
              </div>
            ))}
          </div>
          {!isTerminal(quote.status) && (
            <div className={styles.chatInput}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
              />
              <button type="button" disabled={!draft.trim() || sending} onClick={sendMessage}>
                <Send size={16} aria-hidden />
              </button>
            </div>
          )}
        </section>

        <section className={styles.quickActions}>
          <a href="tel:9167186977" className={styles.primaryBtn}><Phone size={16} aria-hidden />Call Eric</a>
          <a href="sms:9167186977" className={styles.ghostBtn}><MessageCircle size={16} aria-hidden />SMS</a>
          {delivered && <Link to={`/review/${quote.token}`} className={styles.ghostBtn}>Leave a review</Link>}
        </section>

        <section className={styles.meta}>
          <div><MapPin size={14} aria-hidden /><span>Pickup</span><strong>{quote.pickup_city}</strong></div>
          <div><MapPin size={14} aria-hidden /><span>Delivery</span><strong>{quote.delivery_city}</strong></div>
          <div><Clock size={14} aria-hidden /><span>Requested</span><strong>{formatWhen(quote.created_at)}</strong></div>
          {quote.needed_on && <div><Clock size={14} aria-hidden /><span>Needed</span><strong>{quote.needed_on}</strong></div>}
          {quote.miles_estimate && <div><Truck size={14} aria-hidden /><span>Miles</span><strong>~{quote.miles_estimate}</strong></div>}
        </section>
      </main>
      <Footer />
    </>
  )
}
