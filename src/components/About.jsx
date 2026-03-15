import { motion } from 'framer-motion'
import { MapPin, Heart, Award, Shield } from 'lucide-react'
import styles from './About.module.css'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

const FACTS = [
  { icon: MapPin, label: 'Based in', value: 'Lincoln, CA 95648' },
  { icon: Heart, label: 'Family', value: 'Family-owned & operated' },
  { icon: Award, label: 'Owner-operator', value: 'Since 2006' },
  { icon: Shield, label: 'Coverage', value: 'Licensed & insured' },
]

export default function About() {
  return (
    <div className="section-wrapper">
      <motion.section
        className={styles.section}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.05 }}
        variants={container}
      >
      <div className={styles.container}>
        <motion.div className={styles.badgeWrap} variants={item}>
          <div className={styles.badgeRing}>
            <span className={styles.badgeBig}>30+</span>
            <span className={styles.badgeLabel}>Years</span>
          </div>
          <div className={styles.badgeRing}>
            <span className={styles.badgeBig}>2006</span>
            <span className={styles.badgeLabel}>Est.</span>
          </div>
          <div className={styles.badgeRing}>
            <span className={styles.badgeBig}>Eric Z</span>
            <span className={styles.badgeLabel}>Owner</span>
          </div>
        </motion.div>
        <div className={styles.content}>
          <motion.blockquote className={styles.quote} variants={item}>
            When you need it there yesterday, you need someone who answers the phone and shows up.
            That&apos;s what we do — no corporate dispatch, no runaround. One call to Eric.
          </motion.blockquote>
          <motion.div className={styles.facts} variants={item}>
            {FACTS.map(({ icon: Icon, label, value }) => (
              <div key={label} className={styles.fact}>
                <Icon className={styles.factIcon} size={20} aria-hidden />
                <span className={styles.factLabel}>{label}</span>
                <span className={styles.factValue}>{value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
    </div>
  )
}
