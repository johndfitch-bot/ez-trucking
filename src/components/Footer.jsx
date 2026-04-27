import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import styles from './Footer.module.css'

const SERVICES = ['Hay & Ag', 'Gravel / Construction', 'Flatbed', 'Container', 'Hot Shot']
const AREAS = ['NorCal', 'Bay Area', 'Oregon', 'Nevada', 'Lincoln CA']

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoEz}>EZ</span>
            <span className={styles.logoRest}> Trucking LLC</span>
          </Link>
          <p className={styles.tagline}>When you need it there yesterday.</p>
        </div>
        <div className={styles.links}>
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Services</h4>
            <ul className={styles.list}>
              {SERVICES.map((s) => (
                <li key={s}><span className={styles.listItem}>{s}</span></li>
              ))}
            </ul>
          </div>
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Service area</h4>
            <ul className={styles.list}>
              {AREAS.map((a) => (
                <li key={a}><span className={styles.listItem}>{a}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.contact}>
          <a href="tel:9167186977" className={styles.contactLink}>
            <Phone size={18} aria-hidden />
            (916) 718-6977
          </a>
          <a href="mailto:1haytrucker1@gmail.com" className={styles.contactLink}>
            <Mail size={18} aria-hidden />
            1haytrucker1@gmail.com
          </a>
          <span className={styles.contactLink}>
            <MapPin size={18} aria-hidden />
            Lincoln, CA 95648
          </span>
        </div>
      </div>
      <div className={styles.copyright}>
        &copy; {new Date().getFullYear()} Eric Z Trucking LLC
      </div>
    </footer>
  )
}
