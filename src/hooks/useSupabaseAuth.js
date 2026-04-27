import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

export function useSupabaseAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabaseReady) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (alive) setSession(s) })
    return () => { alive = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabaseReady) return { error: new Error('Supabase not configured') }
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabaseReady) return
    await supabase.auth.signOut()
  }, [])

  return { session, user: session?.user ?? null, loading, signIn, signOut }
}
