import { motion } from 'framer-motion'
import { Phone, Wheat, HardHat, Truck, Container } from 'lucide-react'
import styles from './Services.module.css'

const CARDS = [
  {
    id: 'ag',
    image: '/images/ez-hay-night.png',
    icon: Wheat,
    name: 'Agricultural',
    sub: 'Hay & ag hauling',
    description: 'Hay specialist. Bottom dump, bales, and ag commodities across NorCal and beyond.',
    tags: ['Hay', 'Bottom Dump', 'Bales'],
  },
  {
    id: 'construction',
    image: '/images/ez-bales.png',
    icon: HardHat,
    name: 'Construction',
    sub: 'Materials & equipment',
    description: 'Gravel, aggregate, and construction materials. Reliable delivery when the job can\'t wait.',
    tags: ['Gravel', 'Aggregate', 'Materials'],
  },
  {
    id: 'flatbed',
    image: '/images/ez-trees.png',
    icon: Truck,
    name: 'Flatbed',
    sub: '48ft sets & 80K',
    description: 'Flatbed and specialized loads. 48ft sets, 80K capacity. NorCal, Bay Area, Oregon, Nevada.',
    tags: ['Flatbed', '48ft', '80K'],
  },
  {
    id: 'container',
    image: '/images/ez-container2.png',
    icon: Container,
    name: 'Containers',
    sub: 'Containers & hot shot',
    description: 'Container transport and 24/7 emergency hot shot. When you need it there yesterday.',
    tags: ['Containers', 'Hot Shot', '24/7'],
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Services() {
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
        <motion.h2 className={styles.title} variants={item}>What We Haul</motion.h2>
        <div className={styles.grid}>
          {CARDS.map((card) => (
            <motion.article
              key={card.id}
              className={styles.card}
              variants={item}
              style={{ backgroundImage: `url(${card.image})` }}
            >
              <div className={styles.overlay} />
              <div className={styles.cardContent}>
                <card.icon className={styles.icon} size={32} aria-hidden />
                <h3 className={styles.cardName}>{card.name}</h3>
                <p className={styles.cardSub}>{card.sub}</p>
                <p className={styles.cardDesc}>{card.description}</p>
                <div className={styles.tags}>
                  {card.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
        <motion.div className={styles.hotshotBar} variants={item}>
          <span>24/7 Emergency Hot Shot</span>
          <a href="tel:9167186977" className={styles.hotshotCta}>
            <Phone size={18} aria-hidden />
            Call (916) 718-6977
          </a>
        </motion.div>
        <motion.p className={styles.range} variants={item}>
          NorCal / Bay Area / Oregon / Nevada / Placer County / Regional West
        </motion.p>
      </div>
    </motion.section>
    </div>
  )
}
