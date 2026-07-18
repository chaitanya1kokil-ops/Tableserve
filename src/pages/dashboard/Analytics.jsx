import { useEffect, useState, useCallback, useMemo, useId } from 'react'
import {
  TrendingUp,
  ShoppingBag,
  Utensils,
  CircleDollarSign,
  Clock,
  CalendarDays,
  BarChart3,
  Activity,
  Flame,
  Wallet,
  HandCoins,
  Banknote,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/format'
import { Card, FullPageSpinner } from '../../components/ui'

const PERIODS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const METHOD_META = {
  cash: { label: 'Cash', icon: Banknote },
  card: { label: 'Card', icon: CreditCard },
  other: { label: 'Other', icon: HandCoins },
}

function sod(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Preset window, or a custom from–to range (inclusive) if both are set.
function computeRange(period, from, to) {
  if (from && to) {
    const start = new Date(`${from}T00:00:00`)
    const end = new Date(`${to}T00:00:00`)
    end.setDate(end.getDate() + 1)
    return { start, end }
  }
  const todayStart = sod(new Date())
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const days = period === '90d' ? 89 : period === '30d' ? 29 : 6
  const start = new Date(todayStart)
  start.setDate(start.getDate() - days)
  return { start, end: tomorrow }
}

const fmtHour = (h) => {
  const ap = h < 12 ? 'a' : 'p'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}${ap}`
}
const fmtHourLong = (h) => {
  const ap = h < 12 ? 'AM' : 'PM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${ap}`
}

export default function Analytics() {
  const { restaurant } = useAuth()
  const rid = restaurant.id
  const currency = restaurant.currency

  const isTruck = restaurant.business_type === 'food_truck'
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [period, setPeriod] = useState('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const custom = !!(from && to)
  const range = useMemo(() => computeRange(period, from, to), [period, from, to])
  const todayStr = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    setLoading(true)
    const [ordRes, payRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total, status, created_at, table:tables(label), items:order_items(name_snapshot, quantity)')
        .eq('restaurant_id', rid)
        .gte('created_at', range.start.toISOString())
        .lt('created_at', range.end.toISOString()),
      supabase
        .from('payments')
        .select('amount, tip, method, created_at')
        .eq('restaurant_id', rid)
        .gte('created_at', range.start.toISOString())
        .lt('created_at', range.end.toISOString()),
    ])
    setOrders(ordRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }, [rid, range.start, range.end])

  useEffect(() => {
    load()
  }, [load])

  // Exclude cancelled and not-yet-paid (food-truck 'awaiting_payment') orders.
  const paid = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'awaiting_payment')
  const revenue = paid.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const avg = paid.length ? revenue / paid.length : 0
  const itemsSold = paid.reduce(
    (sum, o) => sum + (o.items || []).reduce((a, it) => a + (it.quantity || 0), 0),
    0,
  )

  const stats = [
    { label: 'Revenue', value: formatCurrency(revenue, currency), icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Orders', value: paid.length, icon: ShoppingBag, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Avg. order', value: formatCurrency(avg, currency), icon: CircleDollarSign, tint: 'bg-violet-50 text-violet-600' },
    { label: 'Items sold', value: itemsSold, icon: Utensils, tint: 'bg-amber-50 text-amber-600' },
  ]

  // Peak hours — order count per hour, across the active window.
  const hourAgg = Array.from({ length: 24 }, () => 0)
  for (const o of paid) hourAgg[new Date(o.created_at).getHours()] += 1
  const activeIdx = hourAgg.map((v, h) => (v > 0 ? h : -1)).filter((h) => h >= 0)
  const hourBars = []
  if (activeIdx.length) {
    const lo = activeIdx[0]
    const hi = activeIdx[activeIdx.length - 1]
    for (let h = lo; h <= hi; h++) hourBars.push({ hour: h, label: fmtHour(h), value: hourAgg[h] })
  }
  const maxHour = Math.max(1, ...hourBars.map((b) => b.value))
  const peakIdx = hourBars.reduce((bi, b, i, arr) => (b.value > (arr[bi]?.value || 0) ? i : bi), 0)
  const peakHour = hourBars[peakIdx]

  // Orders per weekday (Mon–Sun).
  const weekAgg = Array(7).fill(0)
  for (const o of paid) weekAgg[(new Date(o.created_at).getDay() + 6) % 7] += 1
  const weekBars = WEEKDAYS.map((label, i) => ({ label, full: WEEKDAYS_FULL[i], value: weekAgg[i] }))
  const maxWeek = Math.max(1, ...weekAgg)
  const busiestDayIdx = weekAgg.indexOf(maxWeek)

  // Payments collected over the range (moved here from the Orders board).
  const collected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const tips = payments.reduce((s, p) => s + Number(p.tip || 0), 0)
  const byMethod = {}
  for (const p of payments) {
    const m = (byMethod[p.method] ||= { amount: 0, count: 0 })
    m.amount += Number(p.amount || 0)
    m.count += 1
  }

  // Top items + busiest tables over the range.
  const tally = {}
  for (const o of paid) for (const it of o.items || []) tally[it.name_snapshot] = (tally[it.name_snapshot] || 0) + (it.quantity || 0)
  const topItems = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxQty = topItems[0]?.[1] || 1

  const tableTally = {}
  for (const o of paid) {
    const key = o.table?.label || 'No table'
    const t = (tableTally[key] ||= { orders: 0, total: 0 })
    t.orders += 1
    t.total += Number(o.total || 0)
  }
  const topTables = Object.entries(tableTally).sort((a, b) => b[1].total - a[1].total).slice(0, 5)

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Analytics</h1>
        <p className="mt-1 text-sm text-stone-500">
          {restaurant.name} · {formatDate(range.start.toISOString())} –{' '}
          {custom ? formatDate(to) : 'today'}
        </p>
      </div>

      {/* Filters: presets + custom day/week range */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 py-0.5">
          {PERIODS.map((p) => {
            const active = !custom && period === p.key
            return (
              <button
                key={p.key}
                onClick={() => {
                  setFrom('')
                  setTo('')
                  setPeriod(p.key)
                }}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? 'bg-brand text-white shadow-sm' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <input
            type="date"
            value={from}
            max={to || todayStr}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <span className="text-stone-400">–</span>
          <input
            type="date"
            value={to}
            min={from}
            max={todayStr}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {custom && (
            <button
              onClick={() => {
                setFrom('')
                setTo('')
              }}
              className="font-semibold text-brand hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <FullPageSpinner label="Crunching numbers…" />
      ) : (
        <>
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

          {/* Peak hours */}
          <Card className="mt-6 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-stone-400" />
              <h2 className="font-display text-lg font-semibold text-stone-900">Peak hours</h2>
            </div>
            {hourBars.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">No orders in this period.</p>
            ) : (
              <ToggleChart
                bars={hourBars}
                max={maxHour}
                peakIdx={peakIdx}
                subtitle={
                  peakHour ? (
                    <>
                      Busiest around{' '}
                      <span className="font-semibold text-stone-700">{fmtHourLong(peakHour.hour)}</span> —{' '}
                      {peakHour.value} {peakHour.value === 1 ? 'order' : 'orders'}.
                    </>
                  ) : (
                    'When your orders come in.'
                  )
                }
                showLabel={(b) => b.hour % 2 === 0}
                tooltipFor={(b) => `${fmtHourLong(b.hour)} · ${b.value} ${b.value === 1 ? 'order' : 'orders'}`}
              />
            )}
          </Card>

          {/* Orders per day of week */}
          <Card className="mt-6 p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-stone-400" />
              <h2 className="font-display text-lg font-semibold text-stone-900">
                Orders per day of the week
              </h2>
            </div>
            {paid.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">No orders in this period.</p>
            ) : (
              <ToggleChart
                bars={weekBars}
                max={maxWeek}
                peakIdx={busiestDayIdx}
                showValues
                subtitle={<>{WEEKDAYS_FULL[busiestDayIdx]} is your busiest day.</>}
                tooltipFor={(b) => `${b.full} · ${b.value} ${b.value === 1 ? 'order' : 'orders'}`}
              />
            )}
          </Card>

          {/* Top items + busiest tables */}
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="font-display text-lg font-semibold text-stone-900">Top items</h2>
              </div>
              {topItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">No sales in this period.</p>
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
                          <div className="h-full rounded-full bg-brand" style={{ width: `${(qty / maxQty) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {!isTruck && (
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-stone-400" />
                  <h2 className="font-display text-lg font-semibold text-stone-900">Busiest tables</h2>
                </div>
                {topTables.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-400">No orders in this period.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {topTables.map(([label, t]) => (
                      <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="font-semibold text-stone-800">{label}</span>
                        <span className="text-stone-500">
                          {t.orders} {t.orders === 1 ? 'order' : 'orders'} ·{' '}
                          <span className="font-bold text-stone-900">{formatCurrency(t.total, currency)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Payments */}
          <Card className="mt-6 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-stone-400" />
              <h2 className="font-display text-lg font-semibold text-stone-900">Payments</h2>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-stone-50 p-3">
                <p className="text-xs text-stone-500">Collected</p>
                <p className="font-display text-xl font-semibold text-stone-900">{formatCurrency(collected, currency)}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-3">
                <p className="text-xs text-stone-500">Tips</p>
                <p className="font-display text-xl font-semibold text-stone-900">{formatCurrency(tips, currency)}</p>
              </div>
            </div>
            {payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">No payments recorded in this period.</p>
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
                          <span className="font-bold text-stone-900">{formatCurrency(m.amount, currency)}</span>
                        </div>
                        <p className="text-xs text-stone-400">{m.count} {m.count === 1 ? 'payment' : 'payments'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// Reusable chart with a bar/line toggle, used for both peak hours and orders
// per weekday. `showLabel` thins axis labels (every 2h for hours); hovering any
// column reveals its exact value via the tooltip. `showValues` puts counts
// above bars (used for the 7-bar weekday chart).
function ToggleChart({ bars, max, peakIdx, subtitle, showLabel = () => true, tooltipFor, showValues = false }) {
  const [type, setType] = useState('bar')
  const [hover, setHover] = useState(null)
  const gid = useId()
  const n = bars.length
  const active = hover ?? peakIdx
  const activeBar = bars[active]
  const at = (i) => `${((i + 0.5) / n) * 100}%`

  const pointY = (v) => 100 - (v / max) * 100
  const line = bars.map((b, i) => `${i === 0 ? 'M' : 'L'} ${i + 0.5} ${pointY(b.value)}`).join(' ')
  const area = `M 0.5 100 ${bars.map((b, i) => `L ${i + 0.5} ${pointY(b.value)}`).join(' ')} L ${n - 0.5} 100 Z`

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{subtitle}</p>
        <div className="inline-flex flex-shrink-0 rounded-lg bg-stone-100 p-0.5">
          <button
            onClick={() => setType('bar')}
            title="Bar chart"
            className={`rounded-md p-1.5 transition ${type === 'bar' ? 'bg-white text-brand shadow-sm' : 'text-stone-400'}`}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setType('line')}
            title="Line chart"
            className={`rounded-md p-1.5 transition ${type === 'line' ? 'bg-white text-brand shadow-sm' : 'text-stone-400'}`}
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative select-none" style={{ height: 180 }} onMouseLeave={() => setHover(null)}>
        {activeBar && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-[11px] font-semibold text-white shadow-lg"
            style={{ left: at(active), top: -4 }}
          >
            {tooltipFor(activeBar)}
          </div>
        )}

        {type === 'line' ? (
          <>
            <svg className="absolute inset-0 h-full w-full text-brand" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none">
              <defs>
                <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill={`url(#${gid})`} />
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {activeBar && (
              <>
                <div className="pointer-events-none absolute top-0 h-full w-px bg-stone-200" style={{ left: at(active) }} />
                <div
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
                  style={{ left: at(active), top: `${pointY(activeBar.value)}%` }}
                />
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-stretch">
            {bars.map((b, i) => {
              const on = i === active
              const pct = Math.round((b.value / max) * 100)
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-1 px-[2px]">
                  {showValues && (
                    <span className={`text-[10px] font-bold ${on ? 'text-brand' : 'text-stone-400'}`}>
                      {b.value || ''}
                    </span>
                  )}
                  <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-lg bg-stone-100">
                    <div
                      className={`w-full rounded-lg transition-[height] duration-500 ${
                        on ? 'bg-gradient-to-t from-brand to-brand' : 'bg-gradient-to-t from-brand/50 to-brand/30'
                      }`}
                      style={{ height: `${pct}%`, minHeight: b.value ? 6 : 0 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="absolute inset-0 flex">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 cursor-pointer" onMouseEnter={() => setHover(i)} />
          ))}
        </div>
      </div>

      <div className="mt-2 flex">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[11px] ${i === active ? 'font-bold text-stone-700' : 'text-stone-400'}`}
          >
            {showLabel(b, i) ? b.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
