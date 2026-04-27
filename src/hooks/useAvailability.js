import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

const STORAGE_KEY = 'ez_status'
const DEFAULT = 'available'

function readLocal() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'limited' || v === 'booked' ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function useAvailability() {
  const [status, setStatusState] = useState(readLocal)

  useEffect(() => {
    if (!supabaseReady) return
    let alive = true
    supabase.from('driver_state').select('status').eq('id', 1).maybeSingle().then(({ data }) => {
      if (alive && data?.status) {
        setStatusState(data.status)
        try { localStorage.setItem(STORAGE_KEY, data.status) } catch { /* noop */ }
      }
    })
    const channel = supabase.channel('driver-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_state' }, (p) => {
        const next = p.new?.status
        if (next) {
          setStatusState(next)
          try { localStorage.setItem(STORAGE_KEY, next) } catch { /* noop */ }
        }
      })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(channel) }
  }, [])

  const setStatus = useCallback(async (value) => {
    const next = ['available', 'limited', 'booked', 'off'].includes(value) ? value : DEFAULT
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* noop */ }
    setStatusState(next)
    window.dispatchEvent(new Event('ez_status'))
    if (supabaseReady) {
      await supabase.from('driver_state').update({ status: next, last_seen_at: new Date().toISOString() }).eq('id', 1)
    }
  }, [])

  useEffect(() => {
    const handleStorage = () => setStatusState(readLocal())
    window.addEventListener('storage', handleStorage)
    window.addEventListener('ez_status', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('ez_status', handleStorage)
    }
  }, [])

  return { status, setStatus }
}
