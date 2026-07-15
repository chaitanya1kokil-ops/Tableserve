import { useEffect, useState, useCallback, useRef } from 'react'
import { Clock, Bell, ChefHat, Check, Ban, Inbox, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { formatCurrency, timeAgo } from '../../lib/format'
import { Badge, EmptyState, FullPageSpinner } from '../../components/ui'

// Paid, in-kitchen states only. Unpaid orders (awaiting_payment) never reach
// this board — the customer paid online, or there is no food to make.
const ACTIVE = ['new', 'preparing', 'ready']

// Per-status action that advances a truck order.
const ADVANCE = {
  new: { to: 'preparing', label: 'Start', icon: ChefHat, cls: 'bg-blue-600 hover:bg-blue-700' },
  preparing: { to: 'ready', label: 'Ready — call name', icon: Bell, cls: 'bg-amber-500 hover:bg-amber-600' },
  ready: { to: 'completed', label: 'Picked up', icon: Check, cls: 'bg-emerald-600 hover:bg-emerald-700' },
}

export default function FoodTruckBoard() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const reloadTimer = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('restaurant_id', rid)
      .in('status', ACTIVE)
      .order('created_at', { ascending: true }) // FIFO
    if (!error) setOrders(data || [])
    setLoading(false)
  }, [rid])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`truck-board-${rid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rid}` },
        () => {
          clearTimeout(reloadTimer.current)
          reloadTimer.current = setTimeout(load, 200)
        },
      )
      .subscribe()
    const tick = setInterval(load, 20000)
    return () => {
      clearTimeout(reloadTimer.current)
      clearInterval(tick)
      supabase.removeChannel(channel)
    }
  }, [rid, load])

  const setStatus = async (order, status) => {
    setOrders((list) =>
      status === 'completed'
        ? list.filter((o) => o.id !== order.id)
        : list.map((o) => (o.id === order.id ? { ...o, status } : o)),
    )
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id)
    if (error) {
      toast.error('Could not update order.')
      load()
    }
  }

  if (loading) return <FullPageSpinner label="Loading orders…" />

  const queue = orders.filter((o) => o.status !== 'ready')
  const ready = orders.filter((o) => o.status === 'ready')

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Orders</h1>
        <p className="flex items-center gap-1.5 text-sm text-stone-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live · paid orders appear here automatically
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No orders cooking"
          description="Paid orders from your QR code land here the moment payment clears."
        />
      ) : (
        <div className="space-y-6">
          {ready.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-emerald-600">
                Ready — call the name ({ready.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ready.map((o) => (
                  <TruckCard key={o.id} order={o} currency={currency} onSet={setStatus} />
                ))}
              </div>
            </section>
          )}
          {queue.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-stone-500">
                In the queue ({queue.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {queue.map((o) => (
                  <TruckCard key={o.id} order={o} currency={currency} onSet={setStatus} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function TruckCard({ order, currency, onSet }) {
  const advance = ADVANCE[order.status]
  const isReady = order.status === 'ready'
  const mins = Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000))
  const late = mins >= 10

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${
        isReady ? 'ring-2 ring-emerald-400' : 'ring-stone-100'
      }`}
    >
      <div className={`flex items-center justify-between px-4 py-3 ${isReady ? 'bg-emerald-50' : ''}`}>
        <span className="flex min-w-0 items-center gap-2">
          <User className={`h-5 w-5 flex-shrink-0 ${isReady ? 'text-emerald-600' : 'text-stone-400'}`} />
          <span className="truncate font-display text-lg font-semibold text-stone-900">
            {order.customer_name || 'Guest'}
          </span>
        </span>
        <span className={`flex flex-shrink-0 items-center gap-1 text-xs ${late ? 'font-bold text-red-500' : 'text-stone-400'}`}>
          <Clock className="h-3.5 w-3.5" />
          {mins < 1 ? 'now' : `${mins}m`}
        </span>
      </div>

      <div className="space-y-1.5 border-t border-stone-100 px-4 py-3">
        {(order.items || []).map((it) => (
          <div key={it.id} className="text-sm">
            <span className="font-bold text-stone-800">{it.quantity}×</span>{' '}
            <span className="text-stone-700">{it.name_snapshot}</span>
            {Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
              <span className="text-stone-400"> · {it.selected_options.map((o) => o.value).join(', ')}</span>
            )}
          </div>
        ))}
        {order.notes && (
          <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">“{order.notes}”</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-stone-100 px-3 py-3">
        {advance && (
          <button
            onClick={() => onSet(order, advance.to)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-[.98] ${advance.cls}`}
          >
            <advance.icon className="h-4 w-4" /> {advance.label}
          </button>
        )}
        <button
          onClick={() => confirm('Cancel this order?') && onSet(order, 'cancelled')}
          className="rounded-xl p-2.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
          title="Cancel"
        >
          <Ban className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t border-stone-100 px-4 py-2 text-right text-xs text-stone-400">
        Paid · <span className="font-semibold text-stone-600">{formatCurrency(order.total, currency)}</span>
      </div>
    </div>
  )
}
