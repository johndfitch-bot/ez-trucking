import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Truck, Clock, CalendarX } from 'lucide-react'
import { useAvailability } from '../hooks/useAvailability'
import styles from './AdminPanel.module.css'

const PIN = 'EZ2006'
const STATUS_OPTIONS = [
  { id: 'available', label: 'Available', icon: Truck, color: 'green' },
  { id: 'limited', label: 'Limited', icon: Clock, color: 'yellow' },
  { id: 'booked', label: 'Booked', icon: CalendarX, color: 'red' },
]

export default function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const { status, setStatus } = useAvailability()

  const handleUnlock = (e) => {
    e.preventDefault()
    if (pin === PIN) {
      setUnlocked(true)
      setMessage('')
    } else {
      setMessage('Wrong PIN')
    }
  }

  if (!unlocked) {
    return (
      <motion.section
        className={styles.section}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className={styles.gate}>
          <Lock className={styles.lockIcon} size={40} aria-hidden />
          <h2 className={styles.gateTitle}>Admin</h2>
          <form onSubmit={handleUnlock} className={styles.gateForm}>
            <input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={styles.pinInput}
              aria-label="PIN"
              autoComplete="off"
            />
            <button type="submit" className={styles.gateBtn}>Enter</button>
          </form>
          {message && <p className={styles.gateError}>{message}</p>}
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.container}>
        <h2 className={styles.title}>Status</h2>
        <p className={styles.hint}>Navbar pill updates in real time from this selection.</p>
        <div className={styles.toggles}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={styles.toggle}
              data-selected={status === opt.id}
              data-color={opt.color}
              onClick={() => setStatus(opt.id)}
            >
              <opt.icon size={24} aria-hidden />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
