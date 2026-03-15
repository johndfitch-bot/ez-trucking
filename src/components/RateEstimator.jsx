import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Calculator } from 'lucide-react'
import styles from './RateEstimator.module.css'

const LOAD_TYPES = ['hay', 'gravel', 'flatbed', 'container', 'hotshot']

const RATE_TABLE = {
  hay: {
    small: [2.8, 3.5],
    full: [3.2, 4.2],
    heavy: [3.8, 5.0],
    min: 350,
  },
  gravel: {
    small: [1.8, 2.5],
    full: [2.2, 3.0],
    heavy: [2.8, 3.8],
    min: 250,
  },
  flatbed: {
    small: [2.5, 3.2],
    full: [3.0, 4.0],
    heavy: [3.8, 5.2],
    min: 300,
  },
  container: {
    small: [3.0, 4.0],
    full: [3.5, 4.8],
    heavy: [4.5, 6.0],
    min: 400,
  },
  hotshot: {
    small: [4.0, 6.0],
    full: [5.0, 7.0],
    heavy: [6.0, 9.0],
    min: 500,
  },
}

const SIZES = [
  { id: 'small', label: 'Small' },
  { id: 'full', label: 'Full' },
  { id: 'heavy', label: 'Heavy' },
]

function round25(n) {
  return Math.round(n / 25) * 25
}

function estimate(loadType, miles, size) {
  const rates = RATE_TABLE[loadType]
  if (!rates || !miles || miles <= 0) return null
  const [lowPerMile, highPerMile] = rates[size] || rates.full
  const min = rates.min
  const low = Math.max(min, round25(miles * lowPerMile))
  const high = Math.max(min, round25(miles * highPerMile))
  return { low, high }
}

const LOAD_LABELS = {
  hay: 'Hay',
  gravel: 'Gravel',
  flatbed: 'Flatbed',
  container: 'Container',
  hotshot: 'Hotshot',
}

export default function RateEstimator() {
  const [loadType, setLoadType] = useState('hay')
  const [miles, setMiles] = useState('')
  const [size, setSize] = useState('full')

  const numMiles = parseInt(miles, 10)
  const result = estimate(loadType, numMiles, size)

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
        <h2 className={styles.title}>Rate estimator</h2>
        <p className={styles.sub}>Ballpark only. Call Eric for exact rates.</p>
        <div className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label}>Load type</label>
            <select
              className={styles.select}
              value={loadType}
              onChange={(e) => setLoadType(e.target.value)}
              aria-label="Load type"
            >
              {LOAD_TYPES.map((t) => (
                <option key={t} value={t}>{LOAD_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Miles</label>
            <input
              type="number"
              className={styles.input}
              min={1}
              placeholder="e.g. 150"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              aria-label="Miles"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Load size</label>
            <select
              className={styles.select}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              aria-label="Load size"
            >
              {SIZES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          {result && (
            <div className={styles.result}>
              <span className={styles.resultLabel}>Est. range</span>
              <span className={styles.resultValue}>${result.low.toLocaleString()} – ${result.high.toLocaleString()}</span>
            </div>
          )}
        </div>
        <a href="tel:9167186977" className={styles.cta}>
          <Phone size={18} aria-hidden />
          Call Eric for Exact Rate
        </a>
      </div>
    </motion.section>
    </div>
  )
}
