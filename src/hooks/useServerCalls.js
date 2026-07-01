import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MUTE_KEY = 'tableserve:calls:muted'

/**
 * Live feed of PENDING "call server" requests for a restaurant.
 * Realtime + a 15s polling fallback, and a doorbell chime when a new call
 * arrives. Exposes a mute toggle (persisted) that doubles as the user gesture
 * browsers require before audio can play.
 *
 * Returns { calls, resolve, muted, toggleMute }.
 */
export function useServerCalls(restaurantId) {
  const [calls, setCalls] = useState([])
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      return false
    }
  })

  const debounce = useRef(null)
  const audioRef = useRef(null)
  const knownIds = useRef(new Set())
  const firstLoad = useRef(true)
  const mutedRef = useRef(muted)
  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    audioRef.current?.resume?.()
    return audioRef.current
  }, [])

  // Unlock audio on the first user interaction (browser autoplay policy).
  useEffect(() => {
    const unlock = () => ensureAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [ensureAudio])

  // Doorbell-style "ding-dong".
  const playChime = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    ;[
      { f: 784, t: 0 }, // G5
      { f: 587, t: 0.22 }, // D5
    ].forEach(({ f, t }) => {
      const start = now + t
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.42)
    })
  }, [])

  const chime = useCallback(() => {
    if (mutedRef.current) return
    playChime()
  }, [playChime])

  const toggleMute = useCallback(() => {
    ensureAudio() // this click is the gesture that unlocks browser audio
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (!next) setTimeout(playChime, 80) // preview the sound when switching on
      return next
    })
  }, [ensureAudio, playChime])

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

    const poll = setInterval(load, 15000)

    return () => {
      clearTimeout(debounce.current)
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [restaurantId, load])

  return { calls, resolve, muted, toggleMute }
}
