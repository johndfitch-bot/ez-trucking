import { motion } from 'framer-motion'
import { Moon } from 'lucide-react'
import styles from './NightOps.module.css'

export default function NightOps() {
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
        <div className={styles.thumbWrap}>
          <img
            src="/images/ez-night-road.png"
            alt="Night road operations"
            className={styles.thumb}
          />
        </div>
        <div className={styles.content}>
          <Moon className={styles.icon} size={36} aria-hidden />
          <h2 className={styles.title}>The Lights Don&apos;t Go Off</h2>
          <p className={styles.copy}>
            We run when you need us. 24/7 emergency hot shot, late-night loads, and weekend hauls
            aren&apos;t the exception — they&apos;re what we do. Owner-operator since 2006 means when you call,
            you get Eric. No dispatch middleman, no after-hours voicemail. When you need it there yesterday,
            we answer.
          </p>
        </div>
      </div>
    </motion.section>
    </div>
  )
}
