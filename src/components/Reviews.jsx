import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, ShieldCheck, Quote } from 'lucide-react'
import { supabase, supabaseReady } from '../lib/supabase'
import styles from './Reviews.module.css'

const FALLBACK = [
  { id: 'f1', client_name: 'Valley Feed Co.', load_type: 'Hay', rating: 5, body: 'Eric hauled our bales through harvest like a machine — on time, every time. You call, he shows up.', verified: true },
  { id: 'f2', client_name: 'Delta Aggregate', load_type: 'Gravel', rating: 5, body: 'Bottom dump gravel into the foothills. Reliable when the project couldn\'t wait. Been calling him for years.', verified: true },
  { id: 'f3', client_name: 'SF Port Logistics', load_type: 'Container', rating: 5, body: 'Intermodal container pulls out of Oakland — no broker games, direct line to the driver. Huge time saver.', verified: true },
]

function Stars({ n }) {
  return (
    <span className={styles.stars} aria-label={`${n} out of 5 stars`}>
      {[1,2,3,4,5].map((i) => <Star key={i} size={14} fill={i <= n ? 'currentColor' : 'none'} aria-hidden />)}
    </span>
  )
}

export default function Reviews() {
  const [list, setList] = useState([])

  useEffect(() => {
    if (!supabaseReady) return
    let alive = true
    supabase.from('reviews').select('*').eq('published', true).order('created_at', { ascending: false }).limit(6).then(({ data }) => {
      if (alive && data?.length) setList(data)
    })
    return () => { alive = false }
  }, [])

  const items = list.length ? list : FALLBACK
  const avg = items.reduce((s, r) => s + r.rating, 0) / items.length

  return (
    <section className={styles.section} id="reviews">
      <motion.div className={styles.head} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}>
        <span className={styles.kicker}>Verified customer reviews</span>
        <h2 className={styles.title}>People keep calling back</h2>
        <div className={styles.avgRow}>
          <Stars n={Math.round(avg)} />
          <strong>{avg.toFixed(1)}</strong>
          <span>avg · {items.length} recent</span>
        </div>
      </motion.div>
      <div className={styles.grid}>
        {items.map((r) => (
          <motion.article
            key={r.id}
            className={styles.card}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <Quote className={styles.quoteIcon} size={18} aria-hidden />
            <p className={styles.body}>{r.body}</p>
            <div className={styles.meta}>
              <Stars n={r.rating} />
              <div className={styles.metaText}>
                <strong>{r.client_name}</strong>
                {r.load_type && <span>{r.load_type}</span>}
              </div>
              {r.verified && (
                <span className={styles.verified}>
                  <ShieldCheck size={12} aria-hidden /> Verified
                </span>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
