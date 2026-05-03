// Lightweight geocoding + distance helpers.
// Uses OpenStreetMap Nominatim (free, usage-policy compliant with caching + attribution).

const UA = 'EricZTruckingLLC/1.0 (+https://eztruckingllc.com)'
const CACHE_KEY = 'ez_geo_cache_v1'

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch { /* noop */ }
}

// Bias geocoding to Eric Z Trucking LLC service area (CA, NV, OR, WA, AZ, ID).
// Bounding box: lon -124.5 to -111, lat 32 to 49.
const VIEWBOX = '-124.5,49,-111,32'

export async function geocode(query) {
  const q = (query || '').trim()
  if (!q) return null
  const cache = loadCache()
  const key = q.toLowerCase()
  if (cache[key] && Date.now() - cache[key].at < 1000 * 60 * 60 * 24 * 7) return cache[key].data
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&viewbox=${VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return null
    let arr = await res.json()
    // Fallback: if no hit inside the West Coast box, try unbounded but still US-only.
    if (!arr?.length) {
      const fallback = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`
      const r2 = await fetch(fallback, { headers: { 'Accept': 'application/json' } })
      if (!r2.ok) return null
      arr = await r2.json()
      if (!arr?.length) return null
    }
    const hit = arr[0]
    const data = {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      display: hit.display_name,
    }
    cache[key] = { at: Date.now(), data }
    saveCache(cache)
    return data
  } catch {
    return null
  }
}

export async function autocomplete(query) {
  const q = (query || '').trim()
  if (q.length < 3) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&addressdetails=1&viewbox=${VIEWBOX}&q=${encodeURIComponent(q)}`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return []
    const arr = await res.json()
    return arr.map((h) => ({
      display: h.display_name,
      short: [h.address?.city || h.address?.town || h.address?.village || h.name, h.address?.state]
        .filter(Boolean).join(', '),
      lat: parseFloat(h.lat),
      lng: parseFloat(h.lon),
    })).filter((h) => h.short)
  } catch {
    return []
  }
}

// Great-circle miles (Haversine). Good enough for a ballpark; road miles run ~15–20% higher.
export function haversineMiles(a, b) {
  if (!a || !b) return null
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Inflate for road routing — empirical factor for NorCal highways.
export function roadMiles(straight) {
  if (straight == null) return null
  return Math.round(straight * 1.18)
}
