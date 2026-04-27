import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MarqueeTrust from './components/MarqueeTrust'
import Services from './components/Services'
import Gallery from './components/Gallery'
import NightOps from './components/NightOps'
import About from './components/About'
import RateEstimator from './components/RateEstimator'
import QuoteForm from './components/QuoteForm'
import GoogleMap from './components/GoogleMap'
import Footer from './components/Footer'
import MobileStickyFooter from './components/MobileStickyFooter'
import AdminPanel from './components/AdminPanel'
import Reviews from './components/Reviews'
import AvailabilityCalendar from './components/AvailabilityCalendar'
import TrackLookup from './components/TrackLookup'
import TrackLoad from './pages/TrackLoad'
import Driver from './pages/Driver'
import ReviewFormPage from './pages/ReviewForm'

function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <MarqueeTrust />
      <Services />
      <TrackLookup />
      <section id="gallery-preview" aria-label="Gallery preview">
        <Gallery preview />
      </section>
      <NightOps />
      <About />
      <Reviews />
      <section id="schedule" aria-label="Availability calendar" style={{ padding: '4rem 1rem', background: 'var(--slate-900)' }}>
        <AvailabilityCalendar />
      </section>
      <RateEstimator />
      <section id="quote" aria-label="Get a quote">
        <div className="quoteSection">
          <QuoteForm />
          <GoogleMap />
        </div>
      </section>
      <Footer />
      <MobileStickyFooter />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/gallery" element={<><Navbar /><Gallery /><Footer /><MobileStickyFooter /></>} />
      <Route path="/track/:token" element={<TrackLoad />} />
      <Route path="/review/:token" element={<ReviewFormPage />} />
      <Route path="/driver" element={<Driver />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
