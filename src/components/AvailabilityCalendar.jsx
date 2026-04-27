import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Truck, Clock, CalendarX } from 'lucide-react'
import { supabase, supabaseReady } from '../lib/supabase'
import styles from './AvailabilityCalendar.module.css'

const LABEL = {
  available: { label: 'Open', color: 'green', icon: Truck },
  limited: { label: 'Limited', color: 'yellow', icon: Clock },
  booked: { label: 'Booked', color: 'red', icon: CalendarX },
  off: { label: 'Off', color: 'slate', icon: CalendarX },
}

function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }
function fmtDay(d) { return d.toISOString().slice(0, 10) }

export default function AvailabilityCalendar({ canEdit = false, month: monthProp }) {
  const [month, setMonth] = useState(() => startOfMonth(monthProp || new Date()))
  const [days, setDays] = useState({})
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    if (!supabaseReady) return
    let alive = true
    const start = fmtDay(month)
    const end = new Date(month); end.setMonth(end.getMonth() + 1)
    supabase.from('availability').select('*').gte('day', start).lt('day', fmtDay(end)).then(({ data }) => {
      if (!alive) return
      const map = {}
      for (const row of data || []) map[row.day] = row
      setDays(map)
    })
    const channel = supabase.channel('avail-days')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, (p) => {
        setDays((prev) => ({ ...prev, [p.new?.day || p.old?.day]: p.new || null }))
      })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(channel) }
  }, [month])

  const cells = useMemo(() => {
    const first = startOfMonth(month)
    const padStart = first.getDay()
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const out = []
    for (let i = 0; i < padStart; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(first); dt.setDate(d)
      out.push(dt)
    }
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [month])

  const setStatus = async (dateKey, status) => {
    if (!canEdit || !supabaseReady) return
    await supabase.from('availability').upsert({ day: dateKey, status, updated_at: new Date().toISOString() }, { onConflict: 'day' })
    setEditing(null)
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const today = fmtDay(new Date())

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <CalendarDays size={18} aria-hidden />
          <h2>{canEdit ? 'Schedule — Eric' : 'When Eric is open'}</h2>
        </div>
        <div className={styles.nav}>
          <button type="button" onClick={() => setMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n })}>‹</button>
          <strong>{monthLabel}</strong>
          <button type="button" onClick={() => setMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n })}>›</button>
        </div>
      </header>
      <div className={styles.weekrow}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className={styles.grid}>
        {cells.map((dt, i) => {
          if (!dt) return <div key={i} className={styles.blank} />
          const key = fmtDay(dt)
          const row = days[key]
          const status = row?.status || 'available'
          const info = LABEL[status] || LABEL.available
          const isToday = key === today
          return (
            <button
              key={i}
              type="button"
              className={styles.day}
              data-color={info.color}
              data-today={isToday}
              onClick={() => canEdit ? setEditing(key) : null}
            >
              <span className={styles.dayNum}>{dt.getDate()}</span>
              <span className={styles.dayChip}>{info.label}</span>
              {row?.note && <span className={styles.dayNote}>{row.note}</span>}
            </button>
          )
        })}
      </div>
      {canEdit && editing && (
        <motion.div className={styles.editor} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span>Set {editing}</span>
          {['available', 'limited', 'booked', 'off'].map((s) => (
            <button key={s} type="button" onClick={() => setStatus(editing, s)}>{LABEL[s].label}</button>
          ))}
          <button type="button" className={styles.cancel} onClick={() => setEditing(null)}>Cancel</button>
        </motion.div>
      )}
      <div className={styles.legend}>
        {Object.entries(LABEL).map(([k, info]) => (
          <span key={k} className={styles.legendItem} data-color={info.color}>{info.label}</span>
        ))}
      </div>
    </section>
  )
}
