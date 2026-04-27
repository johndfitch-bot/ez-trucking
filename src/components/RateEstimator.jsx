import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Calculator, MapPin, Gauge, Sparkles } from 'lucide-react'
import styles from './RateEstimator.module.css'
import { autocomplete, geocode, haversineMiles, roadMiles } from '../lib/geo'
import { estimate, LOAD_LABELS } from '../lib/pricing'

const LOAD_TYPES = ['hay', 'gravel', 'flatbed', 'container', 'hotshot']
const SIZES = [
  { id: 'small', label: 'Partial' },
  { id: 'full', label: 'Full load' },
  { id: 'heavy', label: 'Heavy / 80K' },
]

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

function CityField({ label, value, onChange, onPick, placeholder }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const debounced = useDebounced(value, 380)
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
    <div className={styles.row}>
      <label className={styles.label}>{label}</label>
      <div className={styles.cityWrap}>
        <MapPin size={14} aria-hidden className={styles.cityIcon} />
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label={label}
          autoComplete="off"
        />
        {open && list.length > 0 && (
          <ul className={styles.suggest}>
            {list.map((item, i) => (
              <li key={i}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(item); setOpen(false) }}>
                  <MapPin size={12} aria-hidden />
                  {item.short}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function RateEstimator() {
  const [loadType, setLoadType] = useState('hay')
  const [size, setSize] = useState('full')
  const [pickupCity, setPickupCity] = useState('')
  const [pickupCoords, setPickupCoords] = useState(null)
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryCoords, setDeliveryCoords] = useState(null)
  const [miles, setMiles] = useState('')
  const [computing, setComputing] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!pickupCity || !deliveryCity) return
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setComputing(true)
      let a = pickupCoords || await geocode(pickupCity)
      let b = deliveryCoords || await geocode(deliveryCity)
      if (a) setPickupCoords(a)
      if (b) setDeliveryCoords(b)
      if (a && b) {
        const straight = haversineMiles(a, b)
        setMiles(String(roadMiles(straight)))
      }
      setComputing(false)
    }, 650)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCity, deliveryCity])

  const numMiles = parseInt(miles, 10)
  const result = useMemo(() => estimate(loadType, numMiles, size), [loadType, numMiles, size])

  return (
    <div className="section-wrapper">
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.container}>
          <Calculator className={styles.icon} size={32} aria-hidden />
          <h2 className={styles.title}>Instant rate estimator</h2>
          <p className={styles.sub}>Type cities — miles and ballpark fill themselves in. Call Eric for the exact number.</p>
          <div className={styles.form}>
            <CityField
              label="Pickup"
              value={pickupCity}
              onChange={(v) => { setPickupCity(v); setPickupCoords(null) }}
              onPick={(i) => { setPickupCity(i.short); setPickupCoords({ lat: i.lat, lng: i.lng }) }}
              placeholder="e.g. Marysville"
            />
            <CityField
              label="Delivery"
              value={deliveryCity}
              onChange={(v) => { setDeliveryCity(v); setDeliveryCoords(null) }}
              onPick={(i) => { setDeliveryCity(i.short); setDeliveryCoords({ lat: i.lat, lng: i.lng }) }}
              placeholder="e.g. Sacramento"
            />
            <div className={styles.row}>
              <label className={styles.label}>Load type</label>
              <select className={styles.select} value={loadType} onChange={(e) => setLoadType(e.target.value)} aria-label="Load type">
                {LOAD_TYPES.map((t) => <option key={t} value={t}>{LOAD_LABELS[t]}</option>)}
              </select>
            </div>
            <div className={styles.row}>
              <label className={styles.label}>Size</label>
              <div className={styles.sizeRow}>
                {SIZES.map((s) => (
                  <button key={s.id} type="button" className={styles.sizeBtn} data-selected={size === s.id} onClick={() => setSize(s.id)}>{s.label}</button>
                ))}
              </div>
            </div>
            <div className={styles.row}>
              <label className={styles.label}>Miles {computing && <span className={styles.autoTag}><Sparkles size={11} aria-hidden /> auto</span>}</label>
              <div className={styles.milesWrap}>
                <Gauge size={14} aria-hidden className={styles.cityIcon} />
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  value={miles}
                  placeholder="Auto-fills once cities are picked"
                  onChange={(e) => setMiles(e.target.value)}
                  aria-label="Miles"
                />
              </div>
            </div>
            {result && (
              <motion.div className={styles.result} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <span className={styles.resultLabel}>Ballpark range</span>
                <span className={styles.resultValue}>${result.low.toLocaleString()} – ${result.high.toLocaleString()}</span>
                <span className={styles.resultMeta}>${result.perMileLow}–${result.perMileHigh}/mi · min ${result.minimum}</span>
              </motion.div>
            )}
          </div>
          <a href="tel:9167186977" className={styles.cta}>
            <Phone size={18} aria-hidden />
            Call Eric for an exact rate
          </a>
        </div>
      </motion.section>
    </div>
  )
}
