import { motion } from 'framer-motion'
import styles from './GoogleMap.module.css'

export default function GoogleMap() {
  return (
    <div className="section-wrapper">
      <motion.div
        className={styles.wrapper}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.5 }}
      >
      <h3 className={styles.title}>Lincoln, CA</h3>
      <div className={styles.mapWrap}>
        <iframe
          title="ERIC Z TRUCKING LLC location — Lincoln CA 95648"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d39898.9!2d-121.2928!3d38.8916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x809b2062f2a3f3a3%3A0x0!2sLincoln%2C%20CA%2095648!5e0!3m2!1sen!2sus!4v1"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      </motion.div>
    </div>
  )
}
