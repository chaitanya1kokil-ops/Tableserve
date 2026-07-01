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
  Check,
  Play,
  StickyNote,
  PackageCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'

// Per-item cooking flow. `ready` is the end of the kitchen's job for that item.
const ITEM_NEXT = { new: 'preparing', preparing: 'ready' }

const ITEM_STYLE = {
  new: { pill: 'bg-sky-500/15 text-sky-300', label: 'Queued' },
  preparing: { pill: 'bg-amber-500/15 text-amber-300', label: 'Cooking' },
  ready: { pill: 'bg-emerald-500/15 text-emerald-300', label: 'Ready' },
}

const ITEM_ACTION = { new: { label: 'Start', icon: Play }, preparing: { label: 'Ready', icon: Check } }

// Orders leave the board once served/completed/cancelled.
const ACTIVE_STATUSES = ['new', 'preparing', 'ready']

export default function Kitchen() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const [, forceTick] = useState(0) // refresh elapsed timers periodically

  const reloadTimer = useRef(null)
  const audioRef = useRef(null)
  const seenNewIds = useRef(new Set())
  const firstLoad = useRef(true)

  // --- Sound: a short two-tone chime via the Web Audio API (no asset needed). ---
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
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true }) // FIFO — oldest first
    if (error) {
      setLoading(false)
      return
    }
    const list = data || []

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

  // Advance a single item (new -> preparing -> ready). The DB trigger rolls the
  // change up to the order status, so the reception board + customer stay in sync.
  const advanceItem = async (order, item) => {
    const cur = item.status || 'new'
    const ns = ITEM_NEXT[cur]
    if (!ns) return
    setOrders((list) =>
      list.map((o) =>
        o.id === order.id
          ? { ...o, items: o.items.map((it) => (it.id === item.id ? { ...it, status: ns } : it)) }
          : o,
      ),
    )
    const { error } = await supabase.from('order_items').update({ status: ns }).eq('id', item.id)
    if (error) {
      toast.error('Could not update item.')
      load()
    }
  }

  // Start every not-yet-started item in one tap.
  const startAll = async (order) => {
    setOrders((list) =>
      list.map((o) =>
        o.id === order.id
          ? { ...o, items: o.items.map((it) => (it.status === 'ready' ? it : { ...it, status: 'preparing' })) }
          : o,
      ),
    )
    const { error } = await supabase
      .from('order_items')
      .update({ status: 'preparing' })
      .eq('order_id', order.id)
      .eq('status', 'new')
    if (error) {
      toast.error('Could not update items.')
      load()
    }
  }

  // Whole order handed off to the waiter -> leaves the board.
  const pickup = async (order) => {
    setOrders((list) => list.filter((o) => o.id !== order.id))
    const { error } = await supabase.from('orders').update({ status: 'served' }).eq('id', order.id)
    if (error) {
      toast.error('Could not update order.')
      load()
    }
  }

  const toggleMute = () => {
    ensureAudio() // this click unlocks browser audio
    setMuted((m) => !m)
  }

  const goFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.()
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
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
              {restaurant.name} · {orders.length} active
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
      ) : orders.length === 0 ? (
        <div className="grid min-h-[60vh] place-items-center px-6 text-center">
          <div>
            <ChefHat className="mx-auto h-12 w-12 text-slate-700" />
            <p className="mt-3 text-lg font-bold text-slate-300">All caught up</p>
            <p className="text-sm text-slate-500">New orders appear here instantly.</p>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
          {orders.map((order) => (
            <Ticket
              key={order.id}
              order={order}
              onAdvanceItem={(it) => advanceItem(order, it)}
              onStartAll={() => startAll(order)}
              onPickup={() => pickup(order)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Elapsed minutes -> urgency color. Fresh (green) -> warning (amber) -> late (red).
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

function Ticket({ order, onAdvanceItem, onStartAll, onPickup }) {
  const t = elapsed(order.created_at)
  const items = order.items || []
  const readyCount = items.filter((it) => (it.status || 'new') === 'ready').length
  const hasNew = items.some((it) => (it.status || 'new') === 'new')
  const allReady = items.length > 0 && readyCount === items.length

  return (
    <div
      className={`rounded-2xl border bg-slate-900 shadow-lg ${
        allReady ? 'border-emerald-500/50' : 'border-white/10'
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <Utensils className="h-5 w-5 text-slate-400" />
          {order.table?.label || 'No table'}
          <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-300">
            {readyCount}/{items.length} ready
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-bold ${t.tone} ${t.pulse}`}>
          <Clock className="h-4 w-4" />
          {t.label}
        </div>
      </div>

      <ul className="divide-y divide-white/5 px-2 py-1">
        {items.map((it) => {
          const status = it.status || 'new'
          const style = ITEM_STYLE[status]
          const action = ITEM_ACTION[status]
          const done = status === 'ready'
          return (
            <li
              key={it.id}
              className={`flex items-center gap-3 px-2 py-2.5 ${done ? 'opacity-60' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-brand">{it.quantity}×</span>
                  <span className="text-lg font-bold leading-tight text-white">
                    {it.name_snapshot}
                  </span>
                </div>
                {Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
                  <p className="pl-8 text-sm text-slate-300">
                    {it.selected_options.map((o) => `${o.group}: ${o.value}`).join(' · ')}
                  </p>
                )}
              </div>

              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style.pill}`}>
                {style.label}
              </span>

              {action ? (
                <button
                  onClick={() => onAdvanceItem(it)}
                  className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Check className="h-5 w-5" />
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {order.notes && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          <StickyNote className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{order.notes}</span>
        </div>
      )}

      <div className="border-t border-white/10 p-3">
        {allReady ? (
          <button
            onClick={onPickup}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-base font-bold text-white transition hover:brightness-110 active:scale-[0.99]"
          >
            <PackageCheck className="h-5 w-5" />
            Order ready · hand off
          </button>
        ) : (
          <button
            onClick={onStartAll}
            disabled={!hasNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-base font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-5 w-5" />
            Start all items
          </button>
        )}
      </div>
    </div>
  )
}
