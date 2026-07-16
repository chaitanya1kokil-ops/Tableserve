import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  ShoppingBag,
  Utensils,
  CircleDollarSign,
  Clock,
  CalendarDays,
  BarChart3,
  Activity,
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

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [period, setPeriod] = useState('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const custom = !!(from && to)
  const range = useMemo(() => computeRange(period, from, to), [period, from, to])
  const todayStr = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('total, status, created_at, items:order_items(quantity)')
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
  const weekBars = WEEKDAYS.map((label, i) => ({ label, value: weekAgg[i] }))
  const maxWeek = Math.max(1, ...weekAgg)
  const busiestDayIdx = weekAgg.indexOf(maxWeek)

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
              <PeakHoursChart bars={hourBars} max={maxHour} peakIdx={peakIdx} peakHour={peakHour} />
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
              {paid.length ? `${WEEKDAYS[busiestDayIdx]} is your busiest day.` : 'Monday to Sunday.'}
            </p>
            {paid.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">No orders in this period.</p>
            ) : (
              <WeekdayBars bars={weekBars} max={maxWeek} peakIdx={busiestDayIdx} />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// Peak-hours chart with a bar/line toggle. Hour labels show every 2 hours to
// stay uncluttered on phones/iPads; hovering any column reveals the exact hour
// and its order count via the tooltip.
function PeakHoursChart({ bars, max, peakIdx, peakHour }) {
  const [type, setType] = useState('bar')
  const [hover, setHover] = useState(null)
  const n = bars.length
  const active = hover ?? peakIdx
  const activeBar = bars[active]

  const pointY = (v) => 100 - (v / max) * 100
  const line = bars.map((b, i) => `${i === 0 ? 'M' : 'L'} ${i + 0.5} ${pointY(b.value)}`).join(' ')
  const area = `M 0.5 100 ${bars.map((b, i) => `L ${i + 0.5} ${pointY(b.value)}`).join(' ')} L ${n - 0.5} 100 Z`

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {peakHour ? (
            <>Busiest around <span className="font-semibold text-stone-700">{fmtHourLong(peakHour.hour)}</span> — {peakHour.value} {peakHour.value === 1 ? 'order' : 'orders'}.</>
          ) : (
            'When your orders come in.'
          )}
        </p>
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
        {/* Tooltip */}
        {activeBar && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-[11px] font-semibold text-white shadow-lg"
            style={{ left: `${((active + 0.5) / n) * 100}%`, top: -4 }}
          >
            {fmtHourLong(activeBar.hour)} · {activeBar.value} {activeBar.value === 1 ? 'order' : 'orders'}
          </div>
        )}

        {type === 'line' ? (
          <>
            <svg className="absolute inset-0 h-full w-full text-brand" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="peakfill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#peakfill)" />
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
                <div
                  className="pointer-events-none absolute top-0 h-full w-px bg-stone-200"
                  style={{ left: `${((active + 0.5) / n) * 100}%` }}
                />
                <div
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
                  style={{ left: `${((active + 0.5) / n) * 100}%`, top: `${pointY(activeBar.value)}%` }}
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
                <div key={i} className="flex flex-1 items-end px-[2px]">
                  <div className="relative h-full w-full overflow-hidden rounded-lg bg-stone-100">
                    <div
                      className={`absolute bottom-0 w-full rounded-lg transition-[height] duration-500 ${
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

        {/* Hover zones (work for both chart types) */}
        <div className="absolute inset-0 flex">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 cursor-pointer" onMouseEnter={() => setHover(i)} />
          ))}
        </div>
      </div>

      {/* Hour labels — every 2 hours to avoid crowding */}
      <div className="mt-2 flex">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[11px] ${i === active ? 'font-bold text-stone-700' : 'text-stone-400'}`}
          >
            {b.hour % 2 === 0 ? b.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple weekday bar chart with column tracks and a highlighted busiest day.
function WeekdayBars({ bars, max, peakIdx }) {
  return (
    <div className="flex items-stretch gap-2" style={{ height: 190 }}>
      {bars.map((b, i) => {
        const on = i === peakIdx
        const pct = Math.round((b.value / max) * 100)
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className={`text-[10px] font-bold ${on ? 'text-brand' : 'text-stone-400'}`}>{b.value || ''}</span>
            <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-xl bg-stone-100">
              <div
                className={`w-full rounded-xl transition-[height] duration-500 ${
                  on ? 'bg-gradient-to-t from-brand to-brand' : 'bg-gradient-to-t from-brand/50 to-brand/30'
                }`}
                style={{ height: `${pct}%`, minHeight: b.value ? 8 : 0 }}
                title={`${b.label}: ${b.value} ${b.value === 1 ? 'order' : 'orders'}`}
              />
            </div>
            <span className={`text-[11px] font-medium ${on ? 'text-stone-700' : 'text-stone-400'}`}>{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}
