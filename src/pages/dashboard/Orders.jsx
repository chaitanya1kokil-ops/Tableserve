import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Receipt,
  Clock,
  ChevronRight,
  ChevronDown,
  Ban,
  Inbox,
  Plus,
  ShoppingBag,
  User,
  Printer,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { formatCurrency, timeAgo } from '../../lib/format'
import { ORDER_STATUSES } from '../../lib/constants'
import { Button, Card, Badge, EmptyState, FullPageSpinner } from '../../components/ui'
import NewOrderModal from './NewOrderModal'

// Once an order is served it leaves the active board and moves to Checkout for
// payment — so the board only shows what's still being worked on.
const FILTERS = [
  { key: 'active', label: 'Active', statuses: ['new', 'preparing', 'ready'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
]

// Staff advance orders straight to "ready", then "served" — no separate "start
// preparing" step. Completing/paying happens only in Checkout, so nobody can
// accidentally close a table without charging it.
const ADVANCE = {
  new: { to: 'ready', label: 'Mark ready' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'served', label: 'Mark served' },
}

export default function Orders() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [printer, setPrinter] = useState(null) // {enabled, provider, token}
  const reloadTimer = useRef(null)

  useEffect(() => {
    supabase
      .from('printer_settings')
      .select('enabled, provider, token')
      .eq('restaurant_id', rid)
      .maybeSingle()
      .then(({ data }) => setPrinter(data))
  }, [rid])

  // Re-send a ticket to the kitchen printer (dropped print, paper jam, etc.).
  const reprint = async (order) => {
    await supabase.from('orders').update({ printed_at: null }).eq('id', order.id) // CloudPRNT re-polls
    if (printer?.provider === 'printnode') {
      await fetch('/api/print-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: rid, orderId: order.id, token: printer.token, reprint: true }),
      })
    }
    toast.success('Reprinting ticket…')
  }

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, table:tables(label), items:order_items(*)')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }, [rid])

  // Debounced reload used by realtime events.
  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(load, 250)
  }, [load])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`orders-board-${rid}`)
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

    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(channel)
    }
  }, [rid, load, scheduleReload])

  const updateStatus = async (order, status) => {
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)))
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id)
    if (error) {
      toast.error('Could not update order.')
      load()
    }
  }

  if (loading) return <FullPageSpinner label="Loading orders…" />

  const active = FILTERS.find((f) => f.key === filter)
  const visible = active.statuses
    ? orders.filter((o) => active.statuses.includes(o.status))
    : orders

  // Group by table.
  const groups = {}
  for (const o of visible) {
    const key = o.table?.label || 'No table'
    ;(groups[key] ||= []).push(o)
  }
  const groupKeys = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )

  const counts = {
    active: orders.filter((o) => FILTERS[0].statuses.includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'completed').length,
  }

  // Active board: one flat, dense grid — same-table orders kept adjacent, then
  // oldest first, so a rush of 20 orders is easy to scan without deep scrolling.
  const sortedActive = [...visible].sort((a, b) => {
    const ta = a.table?.label || a.customer_name || '~'
    const tb = b.table?.label || b.customer_name || '~'
    const t = ta.localeCompare(tb, undefined, { numeric: true })
    return t !== 0 ? t : new Date(a.created_at) - new Date(b.created_at)
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            {filter === 'completed' ? 'Completed' : 'Active orders'}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-500">
              {filter === 'completed' ? counts.completed : counts.active}
            </span>
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live · updates automatically
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter(filter === 'active' ? 'completed' : 'active')}
          >
            {filter === 'active' ? `Completed · ${counts.completed}` : '← Active'}
          </Button>
          <Button size="sm" onClick={() => setNewOrderOpen(true)}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        </div>
      </div>

      {newOrderOpen && (
        <NewOrderModal
          restaurant={restaurant}
          onClose={() => setNewOrderOpen(false)}
          onPlaced={load}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'active' ? 'No active orders' : 'Nothing here yet'}
          description={
            filter === 'active'
              ? 'New orders from your tables will appear here instantly.'
              : 'Orders will show up once customers start ordering.'
          }
        />
      ) : filter === 'completed' ? (
        /* Completed: one accumulated card per table, expandable — no card-per-round scroll. */
        <div className="grid gap-3 lg:grid-cols-2">
          {groupKeys.map((tableLabel) => (
            <TableHistoryCard
              key={tableLabel}
              label={tableLabel}
              orders={groups[tableLabel]}
              currency={restaurant.currency}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedActive.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={restaurant.currency}
              onAdvance={() => {
                const next = ADVANCE[order.status]
                if (next) updateStatus(order, next.to)
              }}
              onCancel={() => {
                if (confirm('Cancel this order?')) updateStatus(order, 'cancelled')
              }}
              onReprint={printer?.enabled ? () => reprint(order) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, currency, onAdvance, onCancel, onReprint }) {
  const status = ORDER_STATUSES[order.status] || ORDER_STATUSES.new
  const advance = ADVANCE[order.status]
  const isNew = order.status === 'new'
  const canCancel = ['new', 'preparing'].includes(order.status)
  const who = order.customer_name || order.table?.label || 'No table'

  return (
    <Card className={`overflow-hidden ${isNew ? 'ring-2 ring-blue-300' : ''}`}>
      {/* Thin status strip for an instant color read across the board */}
      <div className={`h-1 w-full ${status.bar}`} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-bold text-gray-900">
              {order.customer_name && <User className="h-4 w-4 flex-shrink-0 text-gray-400" />}
              {who}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <Badge className={status.color}>
                <span className="relative flex h-1.5 w-1.5">
                  {isNew && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.dot} opacity-75`} />
                  )}
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.dot}`} />
                </span>
                {status.label}
              </Badge>
              {order.order_type === 'takeout' && (
                <Badge className="bg-violet-100 text-violet-700">
                  <ShoppingBag className="h-3 w-3" /> Takeout
                </Badge>
              )}
              {order.bill_requested && (
                <Badge className="bg-orange-100 text-orange-700">
                  <Receipt className="h-3 w-3" /> Bill
                </Badge>
              )}
            </div>
          </div>
          <span className="flex flex-shrink-0 items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo(order.created_at)}
          </span>
        </div>

        <div className="mt-2 space-y-0.5 text-sm">
          {(order.items || []).map((it) => (
            <div key={it.id} className="leading-snug">
              <span className="font-bold text-gray-900">{it.quantity}×</span>{' '}
              <span className="text-gray-800">{it.name_snapshot}</span>
              {Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
                <span className="text-xs text-gray-400"> · {it.selected_options.map((o) => o.value).join(', ')}</span>
              )}
            </div>
          ))}
        </div>

        {order.notes && (
          <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">“{order.notes}”</p>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total, currency)}</span>
          <div className="flex items-center gap-1">
            {onReprint && (
              <button
                onClick={onReprint}
                title="Reprint ticket"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <Printer className="h-4 w-4" />
              </button>
            )}
            {canCancel && (
              <button
                onClick={onCancel}
                title="Cancel order"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Ban className="h-4 w-4" />
              </button>
            )}
            {advance && (
              <button
                onClick={onAdvance}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition active:scale-[0.98] ${status.btn}`}
              >
                {advance.label}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// One card per table in the Completed/All tabs: rounds accumulate here instead
// of stacking as individual cards. Tap to expand the round-by-round detail.
// The strip and badge take the color of the most urgent status at the table.
const STATUS_URGENCY = ['new', 'preparing', 'ready', 'served', 'cancelled', 'completed']

function TableHistoryCard({ label, orders, currency }) {
  const [open, setOpen] = useState(false)
  const topStatus =
    STATUS_URGENCY.find((s) => orders.some((o) => o.status === s)) || 'completed'
  const status = ORDER_STATUSES[topStatus]
  const total = orders.reduce((s, o) => s + Number(o.total || 0), 0)
  const itemCount = orders.reduce(
    (n, o) => n + (o.items || []).reduce((a, it) => a + (it.quantity || 0), 0),
    0,
  )
  const latest = orders[0] // list arrives newest-first

  return (
    <div className="self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
      <div className={`h-1.5 w-full ${status.bar}`} />
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-stone-50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-stone-900">{label}</p>
            <Badge className={status.color}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} · {itemCount}{' '}
            {itemCount === 1 ? 'item' : 'items'} · {timeAgo(latest.created_at)}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <span className="font-bold text-stone-900">{formatCurrency(total, currency)}</span>
          <ChevronDown
            className={`h-5 w-5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {orders.map((o) => {
            const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.new
            return (
              <div key={o.id} className="px-4 py-3">
                <div className="mb-1 flex items-center justify-between text-xs text-stone-400">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {timeAgo(o.created_at)}
                    </span>
                    <Badge className={st.color}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </Badge>
                  </span>
                  <span className="font-bold text-stone-700">
                    {formatCurrency(o.total, currency)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-stone-600">
                  {(o.items || []).map((it) => `${it.quantity}× ${it.name_snapshot}`).join(' · ')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

