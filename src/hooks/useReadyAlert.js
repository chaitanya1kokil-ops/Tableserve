import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

/**
 * Loud "order ready" bell for the restaurant dashboard. When the kitchen
 * finishes an order (orders.status flips to 'ready'), floor staff usually
 * are not looking at the screen — so ring hard and toast which table it is.
 * Respects the shared notification mute toggle.
 */
export function useReadyAlert(restaurantId, muted) {
  const toast = useToast()
  const audioRef = useRef(null)
  const alerted = useRef(new Set())
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

  // Kitchen bell: two rounds of three hard dings — built to cut through a
  // busy dining room, unlike the soft "call server" doorbell.
  const ringBell = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    const ding = (start) => {
      ;[880, 1760].forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = f
        const peak = i === 0 ? 0.85 : 0.25 // fundamental + quieter overtone
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
        osc.connect(gain).connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.52)
      })
    }
    ;[0, 0.3, 0.6, 1.4, 1.7, 2.0].forEach((t) => ding(now + t))
  }, [])

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`ready-alert-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const o = payload.new
          // Ring once per order, the first time it lands on "ready".
          if (o?.status !== 'ready' || alerted.current.has(o.id)) return
          alerted.current.add(o.id)
          if (!mutedRef.current) ringBell()
          let label = 'A table'
          if (o.table_id) {
            const { data } = await supabase
              .from('tables')
              .select('label')
              .eq('id', o.table_id)
              .maybeSingle()
            if (data?.label) label = data.label
          }
          toast.success(`🔔 ${label} — order ready in the kitchen!`)
        },
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [restaurantId, ringBell, toast])
}
