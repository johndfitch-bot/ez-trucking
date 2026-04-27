import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import emailjs from '@emailjs/browser'
import { Phone, Send, Check, Wheat, HardHat, Package, Container, Zap, MapPin, User, Copy, ExternalLink, Gauge, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from './QuoteForm.module.css'
import { supabase } from '../lib/supabase'
import { generateTrackingToken } from '../lib/tracking'
import { autocomplete, geocode, haversineMiles, roadMiles } from '../lib/geo'
import { estimate, weightToSize } from '../lib/pricing'

const LOAD_OPTIONS = [
  { id: 'hay', label: 'Hay / Ag', icon: Wheat },
  { id: 'gravel', label: 'Gravel', icon: HardHat },
  { id: 'flatbed', label: 'Flatbed', icon: Package },
  { id: 'container', label: 'Container', icon: Container },
  { id: 'hotshot', label: 'Hot Shot', icon: Zap },
]

const STEPS = [
  { id: 1, title: 'Load' },
  { id: 2, title: 'Trip' },
  { id: 3, title: 'You' },
]

const WEIGHTS = ['Under 10K', '10K-40K', '40K-80K', '80K+']
const SIZES = ['Partial', 'Full Load', 'Oversized']
const SPECIALS = ['Tarping', 'Chains / Straps', 'Permit Load', 'Live Load', 'Hazmat']

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

function Suggest({ value, onPick, placeholder, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const debounced = useDebounced(value, 350)
  useEffect(() => {
    let alive = true
    if (!open || debounced.length < 3) {
      queueMicrotask(() => { if (alive) setList([]) })
      return () => { alive = false }
    }
    autocomplete(debounced).then((r) => { if (alive) setList(r) })
    return () => { alive = false }
  }, [debounced, open])
  return (
    <div className={styles.suggestWrap}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onPick({ text: e.target.value })}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        className={styles.input}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {open && list.length > 0 && (
        <ul className={styles.suggestList}>
          {list.map((item, i) => (
            <li key={i}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick({ text: item.short, coords: { lat: item.lat, lng: item.lng } }); setOpen(false) }}>
                <MapPin size={14} aria-hidden />
                <span>{item.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function QuoteForm() {
  const [step, setStep] = useState(1)
  const [loadType, setLoadType] = useState('')
  const [pickup, setPickup] = useState('')
  const [pickupCoords, setPickupCoords] = useState(null)
  const [delivery, setDelivery] = useState('')
  const [deliveryCoords, setDeliveryCoords] = useState(null)
  const [loadSize, setLoadSize] = useState('')
  const [weight, setWeight] = useState('')
  const [special, setSpecial] = useState([])
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')
  const [miles, setMiles] = useState(null)
  const milesRef = useRef(null)

  const canNext1 = loadType
  const canNext2 = pickup && delivery
  const canSubmit = name && phone

  useEffect(() => {
    let alive = true
    async function resolveMiles() {
      if (!pickup || !delivery) { setMiles(null); return }
      let a = pickupCoords
      let b = deliveryCoords
      if (!a) a = await geocode(pickup)
      if (!b) b = await geocode(delivery)
      if (!alive) return
      if (a) setPickupCoords(a)
      if (b) setDeliveryCoords(b)
      if (a && b) {
        const straight = haversineMiles(a, b)
        setMiles(roadMiles(straight))
      } else {
        setMiles(null)
      }
    }
    clearTimeout(milesRef.current)
    milesRef.current = setTimeout(resolveMiles, 600)
    return () => { alive = false; clearTimeout(milesRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, delivery])

  const preview = useMemo(() => {
    if (!loadType || !miles) return null
    return estimate(loadType, miles, weightToSize(weight))
  }, [loadType, miles, weight])

  const toggleSpecial = (v) => {
    setSpecial((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }

  const handleNext = () => {
    if (step === 1 && canNext1) setStep(2)
    else if (step === 2 && canNext2) setStep(3)
  }
  const handleBack = () => { if (step > 1) setStep(step - 1) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || honeypot) return
    setError('')
    setSending(true)

    const token = generateTrackingToken()
    const payload = {
      token,
      load_type: LOAD_OPTIONS.find((o) => o.id === loadType)?.label ?? loadType,
      load_size: loadSize || null,
      weight: weight || null,
      special,
      pickup_city: pickup,
      delivery_city: delivery,
      pickup_lat: pickupCoords?.lat ?? null,
      pickup_lng: pickupCoords?.lng ?? null,
      delivery_lat: deliveryCoords?.lat ?? null,
      delivery_lng: deliveryCoords?.lng ?? null,
      miles_estimate: miles ?? null,
      needed_on: date || null,
      notes: notes || null,
      quoted_low: preview?.low ?? null,
      quoted_high: preview?.high ?? null,
      client_name: name,
      client_phone: phone,
      client_email: email || null,
      user_agent: navigator.userAgent,
      source: 'web',
    }

    // Primary: Supabase
    if (supabase) {
      try {
        const { data, error: sbErr } = await supabase.from('quotes').insert(payload).select('id, token').single()
        if (sbErr) throw sbErr
        setSuccess({ token: data.token, id: data.id, preview })
        try { localStorage.setItem('ez_last_token', data.token) } catch { /* noop */ }
        setSending(false)
        return
      } catch (err) {
        console.error('Supabase insert failed, falling back to EmailJS', err)
      }
    }

    // Fallback: EmailJS (keeps current deploys functional)
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, {
          from_name: name, from_email: email, phone,
          load_type: payload.load_type, pickup, delivery, date,
          notes: `${notes || ''}\nSize: ${loadSize}\nWeight: ${weight}\nSpecial: ${special.join(', ')}\nMiles est: ${miles || '—'}\nQuote band: ${preview ? `$${preview.low}-$${preview.high}` : '—'}`,
          token,
        }, publicKey)
        setSuccess({ token, preview })
        setSending(false)
        return
      } catch (err) {
        setError(err?.text || 'Failed to send. Call (916) 718-6977.')
        setSending(false)
        return
      }
    }

    // Last resort: mailto
    const body = encodeURIComponent(`${payload.load_type}\n${pickup} → ${delivery}\n${name} ${phone} ${email}\nNeed: ${date || 'ASAP'}\nSize: ${loadSize}\nWeight: ${weight}\nSpecial: ${special.join(', ')}\nMiles: ${miles || '—'}\nNotes: ${notes}`)
    window.location.href = `mailto:1haytrucker1@gmail.com?subject=EZ%20Load%20Request&body=${body}`
    setSuccess({ token, preview })
    setSending(false)
  }

  if (success) {
    const trackUrl = success.token ? `${location.origin}/track/${success.token}` : null
    return (
      <motion.div
        className={styles.success}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Check className={styles.successIcon} size={48} aria-hidden />
        <h3 className={styles.successTitle}>Request sent</h3>
        <p className={styles.successText}>Eric has been alerted. You'll get a confirmation text from him shortly.</p>
        {success.preview && (
          <div className={styles.successBand}>
            <span>Your ballpark</span>
            <strong>${success.preview.low.toLocaleString()} – ${success.preview.high.toLocaleString()}</strong>
          </div>
        )}
        {trackUrl && (
          <div className={styles.trackBox}>
            <span className={styles.trackLabel}>Your tracking link</span>
            <code className={styles.trackToken}>{success.token}</code>
            <div className={styles.trackActions}>
              <button type="button" className={styles.copyBtn} onClick={() => navigator.clipboard?.writeText(trackUrl)}>
                <Copy size={14} aria-hidden /> Copy link
              </button>
              <Link to={`/track/${success.token}`} className={styles.trackLink}>
                Open tracking <ExternalLink size={14} aria-hidden />
              </Link>
            </div>
          </div>
        )}
        <a href="tel:9167186977" className={styles.successCta}>
          <Phone size={20} aria-hidden />
          (916) 718-6977
        </a>
      </motion.div>
    )
  }

  return (
    <div className="section-wrapper">
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
      >
      <h2 className={styles.title}>Get a quote</h2>
      <div className={styles.progressWrap}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={styles.progressDot}
            data-active={step >= s.id}
            data-current={step === s.id}
          />
        ))}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" className={styles.step} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
              <label className={styles.stepLabel}>Load type</label>
              <div className={styles.cards}>
                {LOAD_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" className={styles.card} data-selected={loadType === opt.id} onClick={() => setLoadType(opt.id)}>
                    <opt.icon size={24} aria-hidden />
                    {opt.label}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.next} onClick={handleNext} disabled={!canNext1}>Next</button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" className={styles.step} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
              <label className={styles.stepLabel}>Trip details</label>

              <div className={styles.row}>
                <MapPin size={18} aria-hidden />
                <Suggest value={pickup} placeholder="Pickup city" ariaLabel="Pickup city"
                  onPick={(p) => { setPickup(p.text); if (p.coords) setPickupCoords(p.coords); else setPickupCoords(null) }} />
              </div>
              <div className={styles.row}>
                <MapPin size={18} aria-hidden />
                <Suggest value={delivery} placeholder="Delivery city" ariaLabel="Delivery city"
                  onPick={(p) => { setDelivery(p.text); if (p.coords) setDeliveryCoords(p.coords); else setDeliveryCoords(null) }} />
              </div>

              {miles ? (
                <div className={styles.milesStrip}>
                  <Gauge size={16} aria-hidden />
                  <span>~{miles} mi</span>
                  {preview && (
                    <strong>${preview.low.toLocaleString()} – ${preview.high.toLocaleString()}</strong>
                  )}
                </div>
              ) : null}

              <div className={styles.chipRow}>
                <span className={styles.chipLabel}>Size</span>
                {SIZES.map((s) => (
                  <button key={s} type="button" className={styles.chip} data-selected={loadSize === s} onClick={() => setLoadSize(s)}>{s}</button>
                ))}
              </div>
              <div className={styles.chipRow}>
                <span className={styles.chipLabel}>Weight</span>
                {WEIGHTS.map((w) => (
                  <button key={w} type="button" className={styles.chip} data-selected={weight === w} onClick={() => setWeight(w)}>{w}</button>
                ))}
              </div>
              <div className={styles.chipRow}>
                <span className={styles.chipLabel}>Special</span>
                {SPECIALS.map((s) => (
                  <button key={s} type="button" className={styles.chip} data-selected={special.includes(s)} onClick={() => toggleSpecial(s)}>{s}</button>
                ))}
              </div>

              <div className={styles.row}>
                <CalendarDays size={18} aria-hidden />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} aria-label="Preferred date" />
              </div>
              <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} aria-label="Notes" />
              <div className={styles.buttons}>
                <button type="button" className={styles.back} onClick={handleBack}>Back</button>
                <button type="button" className={styles.next} onClick={handleNext} disabled={!canNext2}>Next</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" className={styles.step} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
              <label className={styles.stepLabel}>Your info</label>
              <div className={styles.row}>
                <User size={18} aria-hidden />
                <input type="text" placeholder="Name or company" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} aria-label="Name" />
              </div>
              <div className={styles.row}>
                <Phone size={18} aria-hidden />
                <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={styles.input} aria-label="Phone" />
              </div>
              <div className={styles.row}>
                <input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} aria-label="Email" />
              </div>

              {preview && (
                <div className={styles.reviewBox}>
                  <div><span>Load</span><strong>{LOAD_OPTIONS.find((o) => o.id === loadType)?.label}</strong></div>
                  <div><span>Trip</span><strong>{pickup} → {delivery}</strong></div>
                  {miles && <div><span>Est. miles</span><strong>{miles}</strong></div>}
                  <div><span>Ballpark</span><strong>${preview.low.toLocaleString()} – ${preview.high.toLocaleString()}</strong></div>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.buttons}>
                <button type="button" className={styles.back} onClick={handleBack}>Back</button>
                <button type="submit" className={styles.submit} disabled={!canSubmit || sending}>
                  <Send size={18} aria-hidden />
                  {sending ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.section>
    </div>
  )
}
