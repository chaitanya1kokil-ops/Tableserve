import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Live feed of PENDING "call server" requests for a restaurant.
 * Uses realtime for instant updates, with a polling fallback so it stays
 * fresh even if realtime delivery is delayed. Chimes when a new call arrives.
 *
 * Returns { calls, resolve }.
 */
export function useServerCalls(restaurantId) {
  const [calls, setCalls] = useState([])

  const debounce = useRef(null)
  const audioRef = useRef(null)
  const knownIds = useRef(new Set())
  const firstLoad = useRef(true)

  // Unlock + play a short chime (browsers require a user gesture to start audio,
  // so we lazily create the context on the first pointer interaction).
  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (Ctx) audioRef.current = new Ctx()
      }
      audioRef.current?.resume?.()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const chime = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    ;[988, 1319].forEach((freq, i) => {
      const t = now + i * 0.18
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.18)
    })
  }, [])

  const load = useCallback(async () => {
    if (!restaurantId) return
    const { data, error } = await supabase
      .from('server_calls')
      .select('*, table:tables(label)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) return
    const list = data || []

    let arrivals = 0
    const nextKnown = new Set()
    for (const c of list) {
      nextKnown.add(c.id)
      if (!knownIds.current.has(c.id) && !firstLoad.current) arrivals++
    }
    knownIds.current = nextKnown
    if (arrivals > 0) chime()
    firstLoad.current = false

    setCalls(list)
  }, [restaurantId, chime])

  const resolve = useCallback(
    async (call) => {
      setCalls((list) => list.filter((c) => c.id !== call.id))
      const { error } = await supabase
        .from('server_calls')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', call.id)
      if (error) load()
    },
    [load],
  )

  useEffect(() => {
    if (!restaurantId) return
    load()

    const channel = supabase
      .channel(`server-calls-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_calls', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          clearTimeout(debounce.current)
          debounce.current = setTimeout(load, 200)
        },
      )
      .subscribe()

    // Fallback poll so calls appear even if realtime is delayed/unavailable.
    const poll = setInterval(load, 15000)

    return () => {
      clearTimeout(debounce.current)
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [restaurantId, load])

  return { calls, resolve }
}
