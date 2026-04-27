import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, CheckCircle2, ShieldCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase, supabaseReady } from '../lib/supabase'
import styles from './ReviewForm.module.css'

export default function ReviewForm() {
  const { token } = useParams()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabaseReady) { setErr('Reviews not configured.'); setLoading(false); return }
      const { data } = await supabase.from('quotes').select('id, token, load_type, client_name, pickup_city, delivery_city, status').eq('token', token).maybeSingle()
      if (!alive) return
      if (!data) { setErr('Load not found.'); setLoading(false); return }
      setQuote(data)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    if (!quote || !body.trim()) return
    setSending(true)
    const { error } = await supabase.from('reviews').insert({
      quote_id: quote.id,
      client_name: quote.client_name,
      rating,
      body: body.trim(),
      load_type: quote.load_type,
      published: false,
      verified: true,
    })
    setSending(false)
    if (error) setErr(error.message)
    else setDone(true)
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : err && !quote ? (
          <div className={styles.card}>
            <h1>Can't load review form</h1>
            <p>{err}</p>
            <Link to="/">Back home</Link>
          </div>
        ) : done ? (
          <motion.div className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <CheckCircle2 size={48} className={styles.doneIcon} aria-hidden />
            <h1>Thanks for the feedback</h1>
            <p>Eric will see it right away. Once he publishes it, it'll show up on the site with a verified badge.</p>
            <Link to="/" className={styles.primaryBtn}>Back home</Link>
          </motion.div>
        ) : (
          <motion.form onSubmit={submit} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className={styles.kicker}><ShieldCheck size={12} aria-hidden /> Verified customer review</span>
            <h1>How did Eric do?</h1>
            <p className={styles.sub}>{quote.pickup_city} → {quote.delivery_city} · {quote.load_type}</p>
            <div className={styles.stars}>
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)}>
                  <Star size={28} fill={n <= rating ? 'currentColor' : 'none'} aria-hidden />
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell other folks what the haul was like."
              rows={5}
              maxLength={500}
            />
            {err && <p className={styles.err}>{err}</p>}
            <button type="submit" className={styles.primaryBtn} disabled={sending || !body.trim()}>
              {sending ? 'Sending…' : 'Submit review'}
            </button>
          </motion.form>
        )}
      </main>
      <Footer />
    </>
  )
}
