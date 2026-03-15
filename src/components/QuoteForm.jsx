import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import emailjs from '@emailjs/browser'
import { Phone, Send, Check, Wheat, HardHat, Package, Container, Zap, MapPin, User } from 'lucide-react'
import styles from './QuoteForm.module.css'

const LOAD_OPTIONS = [
  { id: 'hay', label: 'Hay / Ag', icon: Wheat },
  { id: 'gravel', label: 'Gravel', icon: HardHat },
  { id: 'flatbed', label: 'Flatbed', icon: Package },
  { id: 'container', label: 'Container', icon: Container },
  { id: 'hotshot', label: 'Hot Shot', icon: Zap },
]

const STEPS = [
  { id: 1, title: 'Load type' },
  { id: 2, title: 'Trip details' },
  { id: 3, title: 'Your info' },
]

export default function QuoteForm() {
  const [step, setStep] = useState(1)
  const [loadType, setLoadType] = useState('')
  const [pickup, setPickup] = useState('')
  const [delivery, setDelivery] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const canNext1 = loadType
  const canNext2 = pickup && delivery
  const canSubmit = name && phone && email

  const handleNext = () => {
    if (step === 1 && canNext1) setStep(2)
    else if (step === 2 && canNext2) setStep(3)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || honeypot) return
    setError('')
    setSending(true)
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    if (!serviceId || !templateId || !publicKey) {
      setError('Email not configured. Add VITE_EMAILJS_* to .env')
      setSending(false)
      return
    }
    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: name,
          from_email: email,
          phone,
          load_type: loadType,
          pickup,
          delivery,
          date,
          notes,
        },
        publicKey
      )
      setSuccess(true)
    } catch (err) {
      setError(err?.text || 'Failed to send. Call (916) 718-6977.')
    } finally {
      setSending(false)
    }
  }

  if (success) {
    return (
      <motion.div
        className={styles.success}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Check className={styles.successIcon} size={48} aria-hidden />
        <h3 className={styles.successTitle}>Request sent</h3>
        <p className={styles.successText}>We&apos;ll get back to you shortly. For immediate help, call Eric.</p>
        <a href="tel:9167186977" className={styles.successCta}>
          <Phone size={20} aria-hidden />
          (916) 718-6977
        </a>
      </motion.div>
    )
  }

  return (
    <div className="section-wrapper">
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
      >
      <h2 className={styles.title}>Get a quote</h2>
      <div className={styles.progressWrap}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={styles.progressDot}
            data-active={step >= s.id}
            data-current={step === s.id}
          />
        ))}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              className={styles.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <label className={styles.stepLabel}>Load type</label>
              <div className={styles.cards}>
                {LOAD_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={styles.card}
                    data-selected={loadType === opt.id}
                    onClick={() => setLoadType(opt.id)}
                  >
                    <opt.icon size={24} aria-hidden />
                    {opt.label}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.next} onClick={handleNext} disabled={!canNext1}>
                Next
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              className={styles.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <label className={styles.stepLabel}>Trip details</label>
              <div className={styles.row}>
                <MapPin size={18} aria-hidden />
                <input
                  type="text"
                  placeholder="Pickup city"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className={styles.input}
                  aria-label="Pickup city"
                />
              </div>
              <div className={styles.row}>
                <MapPin size={18} aria-hidden />
                <input
                  type="text"
                  placeholder="Delivery city"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  className={styles.input}
                  aria-label="Delivery city"
                />
              </div>
              <div className={styles.row}>
                <input
                  type="date"
                  placeholder="Preferred date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={styles.input}
                  aria-label="Preferred date"
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
                rows={3}
                aria-label="Notes"
              />
              <div className={styles.buttons}>
                <button type="button" className={styles.back} onClick={handleBack}>Back</button>
                <button type="button" className={styles.next} onClick={handleNext} disabled={!canNext2}>Next</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              className={styles.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <label className={styles.stepLabel}>Your info</label>
              <div className={styles.row}>
                <User size={18} aria-hidden />
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  aria-label="Name"
                />
              </div>
              <div className={styles.row}>
                <Phone size={18} aria-hidden />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={styles.input}
                  aria-label="Phone"
                />
              </div>
              <div className={styles.row}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  aria-label="Email"
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.buttons}>
                <button type="button" className={styles.back} onClick={handleBack}>Back</button>
                <button type="submit" className={styles.submit} disabled={!canSubmit || sending}>
                  <Send size={18} aria-hidden />
                  {sending ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.section>
    </div>
  )
}
