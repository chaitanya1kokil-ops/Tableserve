import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ChefHat,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize,
  Clock,
  Utensils,
  CheckCircle2,
  StickyNote,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { nextStatus } from '../../lib/constants'

// Columns the kitchen cares about (cooking pipeline). "served"/"completed" leave the board.
const COLUMNS = [
  {
    key: 'new',
    title: 'New',
    accent: 'text-sky-300',
    ring: 'border-sky-500/40',
    action: 'Start cooking',
  },
  {
    key: 'preparing',
    title: 'Preparing',
    accent: 'text-amber-300',
    ring: 'border-amber-500/40',
    action: 'Mark ready',
  },
  {
    key: 'ready',
    title: 'Ready · for pickup',
    accent: 'text-emerald-300',
    ring: 'border-emerald-500/40',
    action: 'Picked up',
  },
]

const KITCHEN_STATUSES = ['new', 'preparing', 'ready']

export default function Kitchen() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const [, forceTick] = useState(0) // re-render every 15s so elapsed timers stay fresh

  const reloadTimer = useRef(null)
  const audioRef = useRef(null)
  const seenNewIds = useRef(new Set())
  const firstLoad = useRef(true)

  // --- Sound: a short two-tone chime generated with the Web Audio API. ---
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    if (audioRef.current?.state === 'suspended') audioRef.current.resume()
    return audioRef.current
  }, [])

  const chime = useCallback(() => {
    const ctx = ensureAudio()
    if (!ctx) return
    const now = ctx.currentTime
    ;[880, 1320].forEach((freq, i) => {
      const t = now + i * 0.16
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.16)
    })
  }, [ensureAudio])

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, table:tables(label), items:order_items(*)')
      .eq('restaurant_id', rid)
      .in('status', KITCHEN_STATUSES)
      .order('created_at', { ascending: true }) // FIFO — oldest first
    if (error) {
      setLoading(false)
      return
    }
    const list = data || []

    // Detect brand-new orders that arrived since last load, then chime.
    let arrivals = 0
    for (const o of list) {
      if (o.status === 'new' && !seenNewIds.current.has(o.id)) {
        seenNewIds.current.add(o.id)
        if (!firstLoad.current) arrivals++
      }
    }
    if (arrivals > 0 && !muted) chime()
    firstLoad.current = false

    setOrders(list)
    setLoading(false)
  }, [rid, muted, chime])

  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(load, 250)
  }, [load])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`kitchen-${rid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rid}` },
        scheduleReload,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${rid}` },
        scheduleReload,
      )
      .subscribe()

    const tick = setInterval(() => forceTick((n) => n + 1), 15000)

    return () => {
      clearTimeout(reloadTimer.current)
      clearInterval(tick)
      supabase.removeChannel(channel)
    }
  }, [rid, load, scheduleReload])

  const advance = async (order) => {
    const ns = nextStatus(order.status)
    if (!ns) return
    setOrders((list) => list.filter((o) => o.id !== order.id || KITCHEN_STATUSES.includes(ns)))
    const { error } = await supabase.from('orders').update({ status: ns }).eq('id', order.id)
    if (error) {
      toast.error('Could not update order.')
      load()
    }
  }

  const toggleMute = () => {
    ensureAudio() // this click is the user gesture that unlocks audio
    setMuted((m) => !m)
  }

  const goFullscreen = () => {
    const el = document.documentElement
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.()
  }

  const grouped = COLUMNS.map((c) => ({
    ...c,
    list: orders.filter((o) => o.status === c.key),
  }))

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
            <ChefHat className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">Kitchen Display</h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {restaurant.name} · live
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={muted ? 'Sound off' : 'Sound on'}
            className={`grid h-10 w-10 place-items-center rounded-xl border border-white/10 transition ${
              muted ? 'bg-white/5 text-slate-400' : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button
            onClick={goFullscreen}
            title="Fullscreen"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <Maximize className="h-5 w-5" />
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="grid min-h-[60vh] place-items-center text-slate-400">Loading kitchen…</div>
      ) : (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
          {grouped.map((col) => (
            <section key={col.key} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${col.accent}`}>
                  {col.title}
                </h2>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-200">
                  {col.list.length}
                </span>
              </div>

              <div className="space-y-3">
                {col.list.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
                    Nothing here
                  </div>
                ) : (
                  col.list.map((order) => (
                    <Ticket
                      key={order.id}
                      order={order}
                      ring={col.ring}
                      actionLabel={col.action}
                      onAdvance={() => advance(order)}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// Elapsed minutes -> urgency color. Fresh (green) -> warning (amber) -> late (red, pulsing).
function elapsed(iso) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  let tone = 'text-emerald-300'
  let pulse = ''
  if (mins >= 10) {
    tone = 'text-red-300'
    pulse = 'animate-pulse'
  } else if (mins >= 5) {
    tone = 'text-amber-300'
  }
  return { label: mins < 1 ? 'just now' : `${mins} min`, tone, pulse }
}

function Ticket({ order, ring, actionLabel, onAdvance }) {
  const t = elapsed(order.created_at)
  const items = order.items || []

  return (
    <div className={`rounded-2xl border ${ring} bg-slate-900 shadow-lg`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <Utensils className="h-5 w-5 text-slate-400" />
          {order.table?.label || 'No table'}
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-bold ${t.tone} ${t.pulse}`}>
          <Clock className="h-4 w-4" />
          {t.label}
        </div>
      </div>

      <ul className="space-y-2.5 px-4 py-3">
        {items.map((it) => (
          <li key={it.id}>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-brand">{it.quantity}×</span>
              <span className="text-lg font-bold leading-tight text-white">{it.name_snapshot}</span>
            </div>
            {Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
              <p className="pl-8 text-sm text-slate-300">
                {it.selected_options.map((o) => `${o.group}: ${o.value}`).join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          <StickyNote className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{order.notes}</span>
        </div>
      )}

      <div className="border-t border-white/10 p-3">
        <button
          onClick={onAdvance}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-base font-bold text-white transition hover:brightness-110 active:scale-[0.99]"
        >
          <CheckCircle2 className="h-5 w-5" />
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
