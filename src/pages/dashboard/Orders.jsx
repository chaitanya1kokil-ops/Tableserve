import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Receipt,
  Clock,
  ChevronRight,
  ChevronDown,
  Ban,
  Inbox,
  Plus,
  Banknote,
  CreditCard,
  HandCoins,
  Wallet,
  TrendingUp,
  Flame,
  Utensils,
} from 'lucide-react'
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
  { key: 'analytics', label: 'Analytics', statuses: null },
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
            {counts[f.key] !== undefined && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  filter === f.key ? 'bg-brand text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filter === 'analytics' ? (
        <OrdersAnalytics rid={rid} orders={orders} currency={restaurant.currency} />
      ) : visible.length === 0 ? (
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

/* ------------------------------------------------------- service analytics -- */
const METHOD_META = {
  cash: { label: 'Cash', icon: Banknote },
  card: { label: 'Card', icon: CreditCard },
  other: { label: 'Other', icon: HandCoins },
}

// Today-focused service analytics: sales, collected vs open, tips, payment
// mix, top items and busiest tables. Longer-range trends live on Overview.
function OrdersAnalytics({ rid, orders, currency }) {
  const [payments, setPayments] = useState([])

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('restaurant_id', rid)
        .gte('created_at', todayStart.toISOString())
      setPayments(data || [])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, orders.length])

  const today = orders.filter(
    (o) => new Date(o.created_at) >= todayStart && o.status !== 'cancelled',
  )
  const sales = today.reduce((s, o) => s + Number(o.total || 0), 0)
  const itemsSold = today.reduce(
    (n, o) => n + (o.items || []).reduce((a, it) => a + (it.quantity || 0), 0),
    0,
  )
  const collected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const tips = payments.reduce((s, p) => s + Number(p.tip || 0), 0)
  // Live open tabs (any day): served food that hasn't been paid yet.
  const openTabs = orders.filter(
    (o) => !o.paid_at && !['cancelled', 'completed'].includes(o.status),
  )
  const outstanding = openTabs.reduce((s, o) => s + Number(o.total || 0), 0)

  const byMethod = {}
  for (const p of payments) {
    const m = (byMethod[p.method] ||= { amount: 0, tip: 0, count: 0 })
    m.amount += Number(p.amount || 0)
    m.tip += Number(p.tip || 0)
    m.count += 1
  }

  const tally = {}
  for (const o of today) {
    for (const it of o.items || []) {
      tally[it.name_snapshot] = (tally[it.name_snapshot] || 0) + (it.quantity || 0)
    }
  }
  const topItems = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxQty = topItems[0]?.[1] || 1

  const tableTally = {}
  for (const o of today) {
    const key = o.table?.label || 'No table'
    const t = (tableTally[key] ||= { orders: 0, total: 0 })
    t.orders += 1
    t.total += Number(o.total || 0)
  }
  const topTables = Object.entries(tableTally)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)

  const stats = [
    { label: 'Sales today', value: formatCurrency(sales, currency), icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Collected today', value: formatCurrency(collected, currency), icon: Wallet, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Tips today', value: formatCurrency(tips, currency), icon: HandCoins, tint: 'bg-amber-50 text-amber-600' },
    { label: `Open tabs (${openTabs.length ? new Set(openTabs.map((o) => o.table?.label)).size : 0} tables)`, value: formatCurrency(outstanding, currency), icon: Receipt, tint: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
            <div className={`mb-2 inline-flex rounded-xl p-2 ${s.tint}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl font-semibold text-stone-900">{s.value}</p>
            <p className="text-xs text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Payment mix */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className="mb-4 font-display text-lg font-semibold text-stone-900">
            Payments today
          </h2>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">
              No payments recorded yet today.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(METHOD_META).map(([key, meta]) => {
                const m = byMethod[key]
                if (!m) return null
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-stone-600">
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-stone-800">{meta.label}</span>
                        <span className="font-bold text-stone-900">
                          {formatCurrency(m.amount, currency)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">
                        {m.count} {m.count === 1 ? 'payment' : 'payments'}
                        {m.tip > 0 && <> · {formatCurrency(m.tip, currency)} tips</>}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top items today */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="font-display text-lg font-semibold text-stone-900">Top items today</h2>
          </div>
          {topItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">No sales yet today.</p>
          ) : (
            <div className="space-y-3">
              {topItems.map(([name, qty], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold text-stone-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium text-stone-800">{name}</span>
                      <span className="text-stone-500">{qty} sold</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(qty / maxQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Busiest tables */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
        <div className="mb-4 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-stone-400" />
          <h2 className="font-display text-lg font-semibold text-stone-900">Busiest tables today</h2>
        </div>
        {topTables.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No orders yet today.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {topTables.map(([label, t]) => (
              <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-semibold text-stone-800">{label}</span>
                <span className="text-stone-500">
                  {t.orders} {t.orders === 1 ? 'order' : 'orders'} ·{' '}
                  <span className="font-bold text-stone-900">
                    {formatCurrency(t.total, currency)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
