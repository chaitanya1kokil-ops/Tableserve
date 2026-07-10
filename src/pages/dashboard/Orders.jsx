import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, Clock, ChevronRight, Ban, Inbox, Plus, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { formatCurrency, timeAgo } from '../../lib/format'
import { ORDER_STATUSES, nextStatus } from '../../lib/constants'
import { Button, Card, Badge, EmptyState, FullPageSpinner } from '../../components/ui'
import NewOrderModal from './NewOrderModal'

const FILTERS = [
  { key: 'active', label: 'Active', statuses: ['new', 'preparing', 'ready', 'served'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'all', label: 'All', statuses: null },
]

// Staff can advance orders up to "served" here. Completing an order happens
// only through Checkout, when the bill is actually paid — so nobody can
// accidentally close a table without charging it.
const ADVANCE_LABEL = {
  new: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Mark served',
}

export default function Orders() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const reloadTimer = useRef(null)

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
    all: orders.length,
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live · updates automatically
          </p>
        </div>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
      </div>

      {newOrderOpen && (
        <NewOrderModal
          restaurant={restaurant}
          onClose={() => setNewOrderOpen(false)}
          onPlaced={load}
        />
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {f.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                filter === f.key ? 'bg-brand text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

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
      ) : (
        <div className="space-y-6">
          {groupKeys.map((tableLabel) => (
            <section key={tableLabel}>
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                {tableLabel}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold normal-case text-gray-500">
                  {groups[tableLabel].length}
                </span>
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {groups[tableLabel].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currency={restaurant.currency}
                    onAdvance={() => {
                      const ns = nextStatus(order.status)
                      if (ns) updateStatus(order, ns)
                    }}
                    onCancel={() => {
                      if (confirm('Cancel this order?')) updateStatus(order, 'cancelled')
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, currency, onAdvance, onCancel }) {
  const status = ORDER_STATUSES[order.status] || ORDER_STATUSES.new
  const advanceLabel = ADVANCE_LABEL[order.status]
  const isNew = order.status === 'new'
  const canCancel = ['new', 'preparing'].includes(order.status)

  return (
    <Card
      className={`overflow-hidden transition ${
        isNew ? 'bg-blue-50/40 ring-2 ring-blue-300' : ''
      }`}
    >
      {/* Status strip: instant color read across the board */}
      <div className={`h-1.5 w-full ${status.bar}`} />
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Badge className={status.color}>
            <span className="relative flex h-1.5 w-1.5">
              {isNew && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.dot} opacity-75`} />
              )}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.dot}`} />
            </span>
            {status.label}
          </Badge>
          {order.bill_requested && (
            <Badge className="bg-orange-100 text-orange-700">
              <Receipt className="h-3 w-3" /> Bill
            </Badge>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(order.created_at)}
        </span>
      </div>

      <div className="space-y-2 px-4 py-3">
        {(order.items || []).map((it) => (
          <div key={it.id} className="flex justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span className="font-semibold text-gray-900">{it.quantity}×</span>{' '}
              <span className="text-gray-800">{it.name_snapshot}</span>
              {Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
                <p className="text-xs text-gray-500">
                  {it.selected_options.map((o) => `${o.group}: ${o.value}`).join(' · ')}
                </p>
              )}
            </div>
            <span className="whitespace-nowrap text-gray-500">
              {formatCurrency(it.line_total, currency)}
            </span>
          </div>
        ))}

        {order.notes && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            “{order.notes}”
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <span className="text-base font-bold text-gray-900">
          {formatCurrency(order.total, currency)}
        </span>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <Ban className="h-4 w-4" />
            </Button>
          )}
          {advanceLabel && (
            <button
              onClick={onAdvance}
              className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-bold text-white transition active:scale-[0.98] ${status.btn}`}
            >
              {advanceLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {order.status === 'served' && (
            <Link
              to="/dashboard/checkout"
              className="flex items-center gap-1.5 rounded-xl bg-stone-800 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-stone-900 active:scale-[0.98]"
            >
              <Wallet className="h-4 w-4" /> Take payment
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
