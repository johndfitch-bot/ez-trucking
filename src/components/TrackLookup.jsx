import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Truck } from 'lucide-react'
import styles from './TrackLookup.module.css'
import { formatTrackingToken } from '../lib/tracking'

export default function TrackLookup() {
  const [token, setToken] = useState('')
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    const t = formatTrackingToken(token)
    if (t) navigate(`/track/${t}`)
  }

  const last = (() => { try { return localStorage.getItem('ez_last_token') || '' } catch { return '' } })()

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.info}>
          <Truck size={22} aria-hidden />
          <div>
            <h3>Track your load</h3>
            <p>Got a tracking code from Eric? Paste it in to watch your load live.</p>
          </div>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <Search size={16} aria-hidden />
          <input
            type="text"
            placeholder="EZ-XXXX-XXXX"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-label="Tracking code"
            autoComplete="off"
          />
          <button type="submit">Track</button>
        </form>
        {last && (
          <button type="button" onClick={() => navigate(`/track/${last}`)} className={styles.recent}>
            Recent: <code>{last}</code>
          </button>
        )}
      </div>
    </section>
  )
}
