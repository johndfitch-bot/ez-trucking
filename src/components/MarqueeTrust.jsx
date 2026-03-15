import { motion } from 'framer-motion'
import styles from './MarqueeTrust.module.css'

const ITEMS = [
  'Licensed & Insured',
  'Hay Specialist',
  'Bottom Dump',
  'Container Transport',
  '48ft Sets & 80K',
  'NorCal',
  'Bay Area',
  'Oregon',
  'Nevada',
  'Owner-Operator Since 2006',
  '24/7 Hot Shot',
]

export default function MarqueeTrust() {
  return (
    <div className="section-wrapper">
      <motion.section
        className={styles.wrapper}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.5 }}
      >
      <div className={styles.track} aria-hidden="true">
        <div className={styles.inner}>
          {ITEMS.map((item) => (
            <span key={item} className={styles.item}>{item}</span>
          ))}
          <span className={styles.sep} aria-hidden> · </span>
          {ITEMS.map((item) => (
            <span key={`dup-${item}`} className={styles.item}>{item}</span>
          ))}
          <span className={styles.sep} aria-hidden> · </span>
        </div>
      </div>
    </motion.section>
    </div>
  )
}
