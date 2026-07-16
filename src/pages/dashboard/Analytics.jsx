import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  ShoppingBag,
  Utensils,
  CircleDollarSign,
  Clock,
  CalendarDays,
  Flame,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/format'
import { Card, FullPageSpinner } from '../../components/ui'

const PERIODS = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function sod(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function computeRange(period) {
  const todayStart = sod(new Date())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const days = period === '90d' ? 89 : period === '30d' ? 29 : 6
  const start = new Date(todayStart)
  start.setDate(start.getDate() - days)
  return { start, end: tomorrowStart }
}

const fmtHour = (h) => {
  const ap = h < 12 ? 'a' : 'p'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}${ap}`
}

export default function Analytics() {
  const { restaurant } = useAuth()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [period, setPeriod] = useState('30d')

  const range = useMemo(() => computeRange(period), [period])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('total, status, created_at, items:order_items(name_snapshot, quantity)')
      .eq('restaurant_id', rid)
      .gte('created_at', range.start.toISOString())
      .lt('created_at', range.end.toISOString())
    setOrders(data || [])
    setLoading(false)
  }, [rid, range.start, range.end])

  useEffect(() => {
    load()
  }, [load])

  const paid = orders.filter((o) => o.status !== 'cancelled')
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

  // Peak hours — order count per hour of day, shown across the active window.
  const hourAgg = Array.from({ length: 24 }, () => ({ count: 0, rev: 0 }))
  for (const o of paid) {
    const h = new Date(o.created_at).getHours()
    hourAgg[h].count += 1
    hourAgg[h].rev += Number(o.total || 0)
  }
  const activeHourIdx = hourAgg.map((v, h) => (v.count > 0 ? h : -1)).filter((h) => h >= 0)
  let hourBars = []
  if (activeHourIdx.length) {
    const lo = activeHourIdx[0]
    const hi = activeHourIdx[activeHourIdx.length - 1]
    for (let h = lo; h <= hi; h++) {
      hourBars.push({ label: fmtHour(h), value: hourAgg[h].count, rev: hourAgg[h].rev })
    }
  }
  const maxHour = Math.max(1, ...hourBars.map((b) => b.value))
  const peakHour = hourBars.reduce((best, b) => (b.value > (best?.value || 0) ? b : best), null)

  // Orders per day of the week (Mon–Sun), aggregated across the range.
  const weekAgg = Array(7).fill(0)
  for (const o of paid) {
    const idx = (new Date(o.created_at).getDay() + 6) % 7 // JS Sun=0 -> Mon-first
    weekAgg[idx] += 1
  }
  const weekBars = WEEKDAYS.map((label, i) => ({ label, value: weekAgg[i] }))
  const maxWeek = Math.max(1, ...weekAgg)
  const busiestDayIdx = weekAgg.indexOf(maxWeek)

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Analytics</h1>
        <p className="mt-1 text-sm text-stone-500">
          {restaurant.name} · {formatDate(range.start.toISOString())} – today
        </p>
      </div>

      {/* Period selector */}
      <div className="mb-5 -mx-1 flex gap-1 overflow-x-auto px-1 py-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              period === p.key
                ? 'bg-brand text-white shadow-sm'
                : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
            }`}
          >
            {p.label}
          </button>
        ))}
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
            <div className="mb-1 flex items-center gap-2">
              <Clock className="h-5 w-5 text-stone-400" />
              <h2 className="font-display text-lg font-semibold text-stone-900">Peak hours</h2>
            </div>
            <p className="mb-4 text-sm text-stone-500">
              {peakHour
                ? `Busiest around ${peakHour.label}m — ${peakHour.value} ${peakHour.value === 1 ? 'order' : 'orders'}.`
                : 'When your orders come in, by time of day.'}
            </p>
            {hourBars.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">No orders in this period.</p>
            ) : (
              <BarGraph bars={hourBars} max={maxHour} highlight={(b) => b === peakHour} />
            )}
          </Card>

          {/* Orders per day of week */}
          <Card className="mt-6 p-5">
            <div className="mb-1 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-stone-400" />
              <h2 className="font-display text-lg font-semibold text-stone-900">
                Orders per day of the week
              </h2>
            </div>
            <p className="mb-4 text-sm text-stone-500">
              {paid.length
                ? `${WEEKDAYS[busiestDayIdx]} is your busiest day.`
                : 'How your week is shaping up, Monday to Sunday.'}
            </p>
            {paid.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">No orders in this period.</p>
            ) : (
              <BarGraph
                bars={weekBars}
                max={maxWeek}
                highlight={(b, i) => i === busiestDayIdx}
                minWidth={36}
              />
            )}
          </Card>

          {paid.length === 0 && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-stone-50 p-5 text-sm text-stone-500">
              <Flame className="h-5 w-5 text-stone-400" />
              Once orders start coming in, your peak hours and busiest days appear here.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Simple hand-rolled vertical bar graph — no chart library. Scrolls
// horizontally on small screens so every bar stays readable on mobile.
function BarGraph({ bars, max, highlight, minWidth = 26 }) {
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2" style={{ height: 200 }}>
      {bars.map((b, i) => {
        const on = highlight?.(b, i)
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center gap-1"
            style={{ minWidth }}
          >
            <span className="text-[11px] font-semibold text-stone-500">{b.value || ''}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-all ${on ? 'bg-brand' : 'bg-brand/40'}`}
                style={{
                  height: `${(b.value / max) * 100}%`,
                  minHeight: b.value ? 4 : 0,
                }}
                title={`${b.label}: ${b.value} ${b.value === 1 ? 'order' : 'orders'}`}
              />
            </div>
            <span className="whitespace-nowrap text-[11px] text-stone-400">{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}
