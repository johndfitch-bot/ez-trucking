import { motion } from 'framer-motion'
import { Phone, FileText } from 'lucide-react'
import styles from './Hero.module.css'

export default function Hero() {
  const scrollToQuote = () => {
    document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.section
      className={styles.hero}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className={styles.overlay} />
      <div className={styles.content}>
        <motion.h1
          className={styles.headline}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          When You Need It <span className={styles.highlight}>There Yesterday.</span>
        </motion.h1>
        <motion.p
          className={styles.subtext}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Owner-operator trucking out of Lincoln, CA. Hay, flatbed, containers, hot shot — when you need it, we move it.
        </motion.p>
        <motion.div
          className={styles.ctas}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <a href="tel:9167186977" className={styles.ctaPrimary}>
            <Phone size={20} aria-hidden />
            Call Eric Direct
          </a>
          <button type="button" onClick={scrollToQuote} className={styles.ctaSecondary}>
            <FileText size={20} aria-hidden />
            Get a Quote
          </button>
        </motion.div>
        <motion.div
          className={styles.stats}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <span>30+ Years</span>
          <span>18+ Owner-Op</span>
          <span>5+ Load Types</span>
          <span>24/7</span>
        </motion.div>
      </div>
    </motion.section>
  )
}
