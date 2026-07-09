import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  ShoppingBag,
  Utensils,
  Flame,
  CircleDollarSign,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate, formatTime } from '../../lib/format'
import { ORDER_STATUSES } from '../../lib/constants'
import { Card, Badge, FullPageSpinner, EmptyState, Select } from '../../components/ui'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
]

// Start-of-day helper.
function sod(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function computeRange(period, pickedDate) {
  const todayStart = sod(new Date())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  if (pickedDate) {
    const start = new Date(`${pickedDate}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end, label: formatDate(start.toISOString()) }
  }

  switch (period) {
    case 'yesterday': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 1)
      return { start, end: todayStart, label: 'Yesterday' }
    }
    case '7d': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 6)
      return { start, end: tomorrowStart, label: 'Last 7 days' }
    }
    case '30d': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 29)
      return { start, end: tomorrowStart, label: 'Last 30 days' }
    }
    default:
      return { start: todayStart, end: tomorrowStart, label: 'Today' }
  }
}

export default function Overview() {
  const { restaurant, profile } = useAuth()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [period, setPeriod] = useState('today')
  const [pickedDate, setPickedDate] = useState('')
  const [sort, setSort] = useState('newest')

  const range = useMemo(() => computeRange(period, pickedDate), [period, pickedDate])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, table:tables(label), items:order_items(name_snapshot, quantity, line_total)')
      .eq('restaurant_id', rid)
      .gte('created_at', range.start.toISOString())
      .lt('created_at', range.end.toISOString())
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }, [rid, range.start, range.end])

  useEffect(() => {
    load()
  }, [load])

  const firstName = (profile?.full_name || '').split(' ')[0]
  const accent = restaurant.accent_color || '#ef4444'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Stats for the selected range.
  const paid = orders.filter((o) => o.status !== 'cancelled')
  const revenue = paid.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const avg = paid.length ? revenue / paid.length : 0
  const itemsSold = paid.reduce(
    (sum, o) => sum + (o.items || []).reduce((a, it) => a + (it.quantity || 0), 0),
    0,
  )

  const stats = [
    { label: 'Orders', value: orders.length, icon: ShoppingBag, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Avg. order', value: formatCurrency(avg, currency), icon: CircleDollarSign, tint: 'bg-violet-50 text-violet-600' },
    { label: 'Items sold', value: itemsSold, icon: Utensils, tint: 'bg-amber-50 text-amber-600' },
  ]

  // Popular items in range.
  const tally = {}
  for (const o of paid) {
    for (const it of o.items || []) {
      tally[it.name_snapshot] = (tally[it.name_snapshot] || 0) + (it.quantity || 0)
    }
  }
  const popular = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxQty = popular[0]?.[1] || 1

  // Sorted order list.
  const sortedOrders = [...orders].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sort === 'amount') return Number(b.total || 0) - Number(a.total || 0)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">
          {firstName ? `${greeting}, ${firstName}` : 'Overview'}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {restaurant.name} · showing <span className="font-semibold text-stone-700">{range.label}</span>
        </p>
      </div>

      {/* Period selector */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 py-0.5">
          {PERIODS.map((p) => {
            const active = !pickedDate && period === p.key
            return (
              <button
                key={p.key}
                onClick={() => {
                  setPickedDate('')
                  setPeriod(p.key)
                }}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hidden sm:inline">or pick a day</span>
          <input
            type="date"
            value={pickedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setPickedDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>
      </div>

      {loading ? (
        <FullPageSpinner label="Crunching numbers…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Featured revenue card */}
            <div className="relative overflow-hidden rounded-2xl bg-stone-900 p-4 text-white shadow-sm">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(130% 110% at 100% 0%, ${accent}59, transparent 65%)`,
                }}
              />
              <div className="relative">
                <div className="mb-2 inline-flex rounded-xl bg-white/10 p-2 ring-1 ring-white/15">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="font-display text-2xl font-semibold">
                  {formatCurrency(revenue, currency)}
                </p>
                <p className="text-xs text-white/60">Revenue</p>
              </div>
            </div>
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

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {/* Popular items */}
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="font-display text-lg font-semibold text-stone-900">Popular items</h2>
              </div>
              {popular.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No sales in this period.</p>
              ) : (
                <div className="space-y-3">
                  {popular.map(([name, qty], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-4 text-sm font-bold text-gray-400">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate font-medium text-gray-800">{name}</span>
                          <span className="text-gray-500">{qty} sold</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
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
            </Card>

            {/* Orders in period */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-stone-900">
                  Orders <span className="text-stone-400">({orders.length})</span>
                </h2>
                <div className="w-40 flex-shrink-0">
                  <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!py-2 text-sm">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="amount">Highest total</option>
                  </Select>
                </div>
              </div>
              {sortedOrders.length === 0 ? (
                <EmptyState icon={ShoppingBag} title="No orders" description="Nothing was ordered in this period." />
              ) : (
                <div className="max-h-[28rem] divide-y divide-gray-100 overflow-y-auto">
                  {sortedOrders.map((o) => {
                    const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.new
                    return (
                      <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {o.table?.label || 'No table'} ·{' '}
                            <span className="text-gray-500">
                              {(o.items || []).length} {(o.items || []).length === 1 ? 'item' : 'items'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(o.created_at)} · {formatTime(o.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <Badge className={st.color}>{st.label}</Badge>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(o.total, currency)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
