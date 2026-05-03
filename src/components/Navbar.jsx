import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <span className={styles.logoEz}>ERIC Z</span>
        <span className={styles.logoRest}> TRUCKING LLC / Lincoln CA Est. 2006</span>
      </Link>
      <div className={styles.actions}>
        <a href="#quote" className={styles.quoteLink}>Get a quote</a>
        <a href="tel:9167186977" className={styles.phone}>
          <Phone size={18} aria-hidden />
          (916) 718-6977
        </a>
      </div>
    </nav>
  )
}
