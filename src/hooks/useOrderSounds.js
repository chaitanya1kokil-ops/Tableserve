import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

/**
 * Dashboard sound alerts for the two moments floor staff must not miss:
 *  - a NEW order arriving          -> two-tone ring (rising "ding-dong")
 *  - the kitchen marking it READY  -> loud triple desk-bell strike
 * Both toast the table label and respect the shared notification mute.
 */
export function useOrderSounds(restaurantId, muted) {
  const toast = useToast()
  const audioRef = useRef(null)
  const readyAlerted = useRef(new Set())
  const newAlerted = useRef(new Set())
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

  // One bell strike: layered sine partials with natural exponential decay,
  // modeled on a front-desk bell (inharmonic overtones, fast attack).
  const strike = useCallback((ctx, start, base, loudness = 1) => {
    const partials = [
      { ratio: 1.0, gain: 1.0, decay: 1.5 },
      { ratio: 2.0, gain: 0.5, decay: 1.0 },
      { ratio: 2.96, gain: 0.3, decay: 0.7 },
      { ratio: 4.2, gain: 0.15, decay: 0.45 },
    ]
    for (const p of partials) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = base * p.ratio
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(Math.min(0.9, 0.9 * p.gain * loudness), start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + p.decay)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + p.decay + 0.05)
    }
  }, [])

  // NEW ORDER: friendly rising ding-dong.
  const ringNewOrder = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    strike(ctx, now, 659, 0.8) // E5
    strike(ctx, now + 0.28, 988, 0.9) // B5
  }, [strike])

  // ORDER READY: two crisp desk-bell taps — loud enough to cut through,
  // over in about a second.
  const ringReady = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    strike(ctx, now, 1175, 1) // D6
    strike(ctx, now + 0.32, 1175, 0.8)
  }, [strike])

  const tableLabel = useCallback(async (tableId) => {
    if (!tableId) return 'A table'
    const { data } = await supabase
      .from('tables')
      .select('label')
      .eq('id', tableId)
      .maybeSingle()
    return data?.label || 'A table'
  }, [])

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`order-sounds-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const o = payload.new
          if (!o || newAlerted.current.has(o.id)) return
          newAlerted.current.add(o.id)
          if (!mutedRef.current) ringNewOrder()
          toast.success(`🛎️ New order — ${await tableLabel(o.table_id)}`)
        },
      )
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
          if (o?.status !== 'ready' || readyAlerted.current.has(o.id)) return
          readyAlerted.current.add(o.id)
          if (!mutedRef.current) ringReady()
          toast.success(`🔔 ${await tableLabel(o.table_id)} — order ready in the kitchen!`)
        },
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [restaurantId, ringNewOrder, ringReady, tableLabel, toast])
}
