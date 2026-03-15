import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { Expand } from 'lucide-react'
import styles from './Gallery.module.css'

const GALLERY_IMAGES = [
  '/images/ez-night-road.png',
  '/images/ez-hay-night.png',
  '/images/ez-trees.png',
  '/images/ez-bales.png',
  '/images/ez-container1.png',
  '/images/ez-container2.png',
  '/images/ez-flatbed-sf.png',
  '/images/ez-night-yard.png',
]

const CAPTIONS = [
  'Night road',
  'Hay & ag',
  'Flatbed / trees',
  'Bales',
  'Containers 1',
  'Containers 2',
  'Flatbed SF',
  'Night yard',
]

export default function Gallery({ preview }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const images = preview ? GALLERY_IMAGES.slice(0, 4) : GALLERY_IMAGES
  const slides = GALLERY_IMAGES.map((src, i) => ({ src, title: CAPTIONS[i] }))

  const openAt = (index) => {
    const fullIndex = preview ? index : index
    setLightboxIndex(preview ? index : index)
    setLightboxOpen(true)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  }

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
        <motion.div className={styles.header} variants={item}>
          <h2 className={styles.title}>Gallery</h2>
          {preview && (
            <Link to="/gallery" className={styles.viewAll}>
              View all photos
            </Link>
          )}
        </motion.div>
        <div className={preview ? styles.gridPreview : styles.grid}>
          {images.map((src, index) => (
            <motion.button
              key={src}
              type="button"
              className={styles.thumb}
              variants={item}
              onClick={() => openAt(preview ? index : index)}
              style={{ backgroundImage: `url(${src})` }}
            >
              <span className={styles.caption}>{CAPTIONS[GALLERY_IMAGES.indexOf(src)]}</span>
              <Expand className={styles.expandIcon} size={24} aria-hidden />
            </motion.button>
          ))}
        </div>
      </div>
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
      />
    </motion.section>
    </div>
  )
}
