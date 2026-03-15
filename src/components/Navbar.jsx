import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { useAvailability } from '../hooks/useAvailability'
import styles from './Navbar.module.css'

const STATUS_MAP = {
  available: { label: 'Available', color: 'green' },
  limited: { label: 'Limited', color: 'yellow' },
  booked: { label: 'Booked', color: 'red' },
}

export default function Navbar() {
  const { status } = useAvailability()
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.available

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <span className={styles.logoEz}>EZ</span>
        <span className={styles.logoRest}> Trucking LLC / Lincoln CA Est. 2006</span>
      </Link>
      <div className={styles.center}>
        <span className={styles.pill} data-color={statusInfo.color}>
          <span className={styles.dot} />
          {statusInfo.label}
        </span>
      </div>
      <a href="tel:9167186977" className={styles.phone}>
        <Phone size={18} aria-hidden />
        (916) 718-6977
      </a>
    </nav>
  )
}
