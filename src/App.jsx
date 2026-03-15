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

function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <MarqueeTrust />
      <Services />
      <section id="gallery-preview" aria-label="Gallery preview">
        <Gallery preview />
      </section>
      <NightOps />
      <About />
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
      <Route path="/admin" element={<><Navbar /><AdminPanel /><Footer /></>} />
    </Routes>
  )
}

export default App
