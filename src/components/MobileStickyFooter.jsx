import { Phone, MessageCircle } from 'lucide-react'
import styles from './MobileStickyFooter.module.css'

export default function MobileStickyFooter() {
  return (
    <div className={styles.wrapper}>
      <a href="tel:9167186977" className={styles.btn}>
        <Phone size={22} aria-hidden />
        Call Eric
      </a>
      <a href="sms:9167186977" className={styles.btn}>
        <MessageCircle size={22} aria-hidden />
        Text for Quote
      </a>
    </div>
  )
}
