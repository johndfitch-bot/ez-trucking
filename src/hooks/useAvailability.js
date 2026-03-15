import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ez_status'
const DEFAULT = 'available'

function readStatus() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'limited' || v === 'booked' ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function useAvailability() {
  const [status, setStatusState] = useState(readStatus)

  const setStatus = useCallback((value) => {
    const next = value === 'limited' || value === 'booked' ? value : DEFAULT
    localStorage.setItem(STORAGE_KEY, next)
    setStatusState(next)
    window.dispatchEvent(new Event('ez_status'))
  }, [])

  useEffect(() => {
    const handleStorage = () => setStatusState(readStatus())
    window.addEventListener('storage', handleStorage)
    window.addEventListener('ez_status', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('ez_status', handleStorage)
    }
  }, [])

  return { status, setStatus }
}
