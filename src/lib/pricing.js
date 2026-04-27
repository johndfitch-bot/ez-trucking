// Central pricing rules — used by RateEstimator and QuoteForm preview.

export const RATE_TABLE = {
  hay:       { small: [2.8, 3.5], full: [3.2, 4.2], heavy: [3.8, 5.0], min: 350 },
  gravel:    { small: [1.8, 2.5], full: [2.2, 3.0], heavy: [2.8, 3.8], min: 250 },
  flatbed:   { small: [2.5, 3.2], full: [3.0, 4.0], heavy: [3.8, 5.2], min: 300 },
  container: { small: [3.0, 4.0], full: [3.5, 4.8], heavy: [4.5, 6.0], min: 400 },
  hotshot:   { small: [4.0, 6.0], full: [5.0, 7.0], heavy: [6.0, 9.0], min: 500 },
}

export const LOAD_LABELS = {
  hay: 'Hay / Ag',
  gravel: 'Gravel / Rock',
  flatbed: 'Flatbed Freight',
  container: 'Container',
  hotshot: 'Hot Shot',
}

function round25(n) { return Math.round(n / 25) * 25 }

export function estimate(loadType, miles, size = 'full') {
  const rates = RATE_TABLE[loadType]
  if (!rates || !miles || miles <= 0) return null
  const [lo, hi] = rates[size] || rates.full
  const low = Math.max(rates.min, round25(miles * lo))
  const high = Math.max(rates.min, round25(miles * hi))
  return { low, high, perMileLow: lo, perMileHigh: hi, minimum: rates.min }
}

export function weightToSize(weight) {
  if (!weight) return 'full'
  const w = weight.toLowerCase()
  if (w.includes('under 10k')) return 'small'
  if (w.includes('80k')) return 'heavy'
  if (w.includes('40k-80k') || w.includes('40k–80k') || w.includes('40k to 80k')) return 'heavy'
  return 'full'
}
