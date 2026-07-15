import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Store,
  LogOut,
  Building2,
  ShoppingBag,
  TrendingUp,
  Search,
  ShieldCheck,
  Pause,
  Play,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase, imageUrl } from '../../lib/supabase'
import { formatCurrency, formatDate, timeAgo } from '../../lib/format'
import { RESTAURANT_STATUS } from '../../lib/constants'
import { Button, Badge, Input, FullPageSpinner, EmptyState } from '../../components/ui'
import { PLANS } from '../../lib/constants'

const STATUS_FILTERS = ['all', 'pending', 'active', 'suspended']
const DAY_MS = 24 * 60 * 60 * 1000

// Client health from their most recent order.
function healthOf(lastOrderAt) {
  if (!lastOrderAt) return { label: 'No orders yet', dot: 'bg-stone-300', text: 'text-stone-400' }
  const age = Date.now() - new Date(lastOrderAt).getTime()
  if (age < 1 * DAY_MS) return { label: 'Active today', dot: 'bg-emerald-500', text: 'text-emerald-600' }
  if (age < 3 * DAY_MS) return { label: 'Active this week', dot: 'bg-emerald-400', text: 'text-emerald-600' }
  if (age < 7 * DAY_MS) return { label: 'Quiet', dot: 'bg-amber-400', text: 'text-amber-600' }
  return { label: `Inactive · ${timeAgo(lastOrderAt)}`, dot: 'bg-red-400', text: 'text-red-500' }
}

export default function Admin() {
  const { profile, signOut } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState([])
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const [{ data: rests }, { data: ords }] = await Promise.all([
      supabase
        .from('restaurants')
        .select('*, owner:profiles!restaurants_owner_id_fkey(email, full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('restaurant_id, total, status, created_at'),
    ])
    setRestaurants(rests || [])
    setOrders(ords || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const a = useMemo(() => computeAnalytics(restaurants, orders), [restaurants, orders])

  const setStatus = async (restaurant, status) => {
    setRestaurants((list) => list.map((r) => (r.id === restaurant.id ? { ...r, status } : r)))
    const { error } = await supabase.from('restaurants').update({ status }).eq('id', restaurant.id)
    if (error) {
      toast.error(error.message)
      load()
    } else {
      toast.success(`${restaurant.name} ${status === 'active' ? 'activated' : status}.`)
    }
  }

  const setPlan = async (restaurant, plan) => {
    setRestaurants((list) => list.map((r) => (r.id === restaurant.id ? { ...r, plan } : r)))
    const { error } = await supabase.from('restaurants').update({ plan }).eq('id', restaurant.id)
    if (error) {
      toast.error(error.message)
      load()
    } else {
      toast.success(`${restaurant.name} moved to ${PLANS[plan].label}.`)
    }
  }

  if (loading) return <FullPageSpinner label="Loading platform…" />

  const counts = {
    all: restaurants.length,
    pending: restaurants.filter((r) => r.status === 'pending').length,
    active: restaurants.filter((r) => r.status === 'active').length,
    suspended: restaurants.filter((r) => r.status === 'suspended').length,
  }

  const filtered = restaurants
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="min-h-[100dvh] bg-[#faf6ef]">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#faf6ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2 font-extrabold text-stone-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-900 text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            TableServe <span className="font-semibold text-stone-400">HQ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-500 sm:block">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Platform</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your clients, revenue and activity across TableServe.
        </p>

        {/* -------------------------------------------------------- stat row */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* MRR — featured */}
          <div className="relative overflow-hidden rounded-2xl bg-stone-900 p-4 text-white shadow-sm">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(130% 110% at 100% 0%, rgba(180,83,9,.45), transparent 65%)' }}
            />
            <div className="relative">
              <div className="mb-2 inline-flex rounded-xl bg-white/10 p-2 ring-1 ring-white/15">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="font-display text-2xl font-semibold">{formatCurrency(a.mrr)}</p>
              <p className="text-xs text-white/60">MRR · {a.payingCount} paying {a.payingCount === 1 ? 'client' : 'clients'}</p>
            </div>
          </div>
          <StatCard
            icon={Building2}
            tint="bg-blue-50 text-blue-600"
            value={restaurants.length}
            label={a.newThisMonth > 0 ? `Clients · +${a.newThisMonth} this month` : 'Clients'}
          />
          <StatCard
            icon={ShoppingBag}
            tint="bg-violet-50 text-violet-600"
            value={a.orders30}
            label="Orders · last 30 days"
          />
          <StatCard
            icon={CheckCircle2}
            tint="bg-emerald-50 text-emerald-600"
            value={formatCurrency(a.gmv30)}
            label="Order volume · last 30 days"
          />
        </div>

        {/* ----------------------------------------------- chart + plan mix */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-stone-400" />
                <h2 className="font-display text-lg font-semibold text-stone-900">
                  Order volume · last 14 days
                </h2>
              </div>
              <span className="text-sm font-bold text-stone-900">{formatCurrency(a.gmv14)}</span>
            </div>
            <p className="mb-4 text-xs text-stone-400">Across every client restaurant.</p>
            {a.gmv14 === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">
                No orders in the last 14 days.
              </p>
            ) : (
              <>
                <div className="flex h-36 items-end gap-1.5">
                  {a.days.map((d) => (
                    <div
                      key={d.key}
                      className="group flex h-full flex-1 flex-col justify-end"
                      title={`${d.label} — ${formatCurrency(d.total)} · ${d.count} ${d.count === 1 ? 'order' : 'orders'}`}
                    >
                      <div
                        className={`w-full rounded-t transition ${
                          d.total > 0 ? 'bg-brand/75 group-hover:bg-brand' : 'bg-stone-100'
                        }`}
                        style={{ height: `${d.total > 0 ? Math.max((d.total / a.maxDay) * 100, 5) : 3}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1.5 text-center">
                  {a.days.map((d) => (
                    <span key={d.key} className="flex-1 text-[10px] text-stone-400">
                      {d.short}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Plan mix */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
            <h2 className="mb-4 font-display text-lg font-semibold text-stone-900">Plan mix</h2>
            <div className="space-y-3.5">
              {Object.entries(PLANS).map(([key, p]) => {
                const count = a.planMix[key] || 0
                const pct = restaurants.length ? (count / restaurants.length) * 100 : 0
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-stone-700">
                        <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                        {p.label}
                        {p.price > 0 && <span className="text-xs text-stone-400">${p.price}/mo</span>}
                      </span>
                      <span className="font-bold text-stone-900">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${p.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-5 border-t border-stone-100 pt-3 text-xs text-stone-400">
              {a.trialExpiring > 0 ? (
                <span className="font-semibold text-amber-600">
                  {a.trialExpiring} {a.trialExpiring === 1 ? 'trial expires' : 'trials expire'} within 7 days
                </span>
              ) : (
                'No trials expiring this week.'
              )}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------- clients */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold text-stone-900">Clients</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-stone-200">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                    filter === f ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {f} <span className={filter === f ? 'text-white/60' : 'text-stone-300'}>{counts[f]}</span>
                </button>
              ))}
            </div>
            <div className="relative sm:w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 pb-10">
          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No clients found" description="Nothing matches your filter." />
          ) : (
            filtered.map((r) => (
              <ClientCard
                key={r.id}
                restaurant={r}
                usage={a.perRest[r.id]}
                onSetStatus={setStatus}
                onSetPlan={setPlan}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ analytics -- */
function computeAnalytics(restaurants, orders) {
  const now = new Date()
  const valid = orders.filter((o) => o.status !== 'cancelled')

  // 14 daily buckets, oldest first.
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      short: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      total: 0,
      count: 0,
    })
  }
  const dayIdx = Object.fromEntries(days.map((d, i) => [d.key, i]))

  const perRest = {}
  let gmv30 = 0
  let orders30 = 0
  let gmv14 = 0
  const t30 = now.getTime() - 30 * DAY_MS
  const t7 = now.getTime() - 7 * DAY_MS
  const t14 = now.getTime() - 14 * DAY_MS

  for (const o of valid) {
    const t = new Date(o.created_at).getTime()
    const total = Number(o.total || 0)
    const rest = (perRest[o.restaurant_id] ||= {
      orders: 0, revenue: 0, orders7: 0, ordersPrev7: 0, revenue30: 0, lastOrderAt: null,
    })
    rest.orders += 1
    rest.revenue += total
    if (!rest.lastOrderAt || o.created_at > rest.lastOrderAt) rest.lastOrderAt = o.created_at
    if (t >= t30) {
      gmv30 += total
      orders30 += 1
      rest.revenue30 += total
    }
    if (t >= t7) rest.orders7 += 1
    else if (t >= t14) rest.ordersPrev7 += 1

    const key = new Date(o.created_at).toISOString().slice(0, 10)
    const idx = dayIdx[new Date(new Date(o.created_at).setHours(0, 0, 0, 0)).toISOString().slice(0, 10)] ?? dayIdx[key]
    if (idx !== undefined) {
      days[idx].total += total
      days[idx].count += 1
      gmv14 += total
    }
  }

  const planMix = {}
  let mrr = 0
  let payingCount = 0
  let trialExpiring = 0
  let newThisMonth = 0
  for (const r of restaurants) {
    const plan = r.plan || 'trial'
    planMix[plan] = (planMix[plan] || 0) + 1
    if (r.status === 'active' && PLANS[plan]?.price > 0) {
      mrr += PLANS[plan].price
      payingCount += 1
    }
    if (plan === 'trial' && r.trial_ends_at) {
      const ends = new Date(r.trial_ends_at).getTime()
      if (ends > now.getTime() && ends < now.getTime() + 7 * DAY_MS) trialExpiring += 1
    }
    const created = new Date(r.created_at)
    if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) {
      newThisMonth += 1
    }
  }

  return {
    days,
    maxDay: Math.max(...days.map((d) => d.total), 1),
    perRest,
    gmv30,
    gmv14,
    orders30,
    planMix,
    mrr,
    payingCount,
    trialExpiring,
    newThisMonth,
  }
}

/* ------------------------------------------------------------ components -- */
function StatCard({ icon: Icon, tint, value, label }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
      <div className={`mb-2 inline-flex rounded-xl p-2 ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-2xl font-semibold text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  )
}

function Trend({ current, previous }) {
  if (current === previous) {
    return (
      <span className="flex items-center gap-0.5 text-stone-400">
        <Minus className="h-3.5 w-3.5" /> flat
      </span>
    )
  }
  const up = current > previous
  return (
    <span className={`flex items-center gap-0.5 font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? '+' : ''}
      {current - previous} vs prior week
    </span>
  )
}

function ClientCard({ restaurant: r, usage, onSetStatus, onSetPlan }) {
  const status = RESTAURANT_STATUS[r.status] || RESTAURANT_STATUS.active
  const plan = PLANS[r.plan] || PLANS.trial
  const health = healthOf(usage?.lastOrderAt)
  const trialEnds = r.plan === 'trial' && r.trial_ends_at ? new Date(r.trial_ends_at) : null
  const trialExpired = trialEnds && trialEnds < new Date()

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* identity */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {r.logo_url ? (
            <img src={imageUrl(r.logo_url)} alt="" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
          ) : (
            <span
              className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl text-white"
              style={{ backgroundColor: r.accent_color || '#b45309' }}
            >
              <Store className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-bold text-stone-900">{r.name}</p>
              <Badge className={status.color}>{status.label}</Badge>
              <Badge className={plan.color}>
                {plan.label}
                {plan.price > 0 && <> · ${plan.price}/mo</>}
              </Badge>
              {trialEnds && (
                <span className={`text-[11px] font-semibold ${trialExpired ? 'text-red-500' : 'text-stone-400'}`}>
                  {trialExpired ? 'trial expired' : `trial ends ${formatDate(r.trial_ends_at)}`}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${health.dot}`} />
              <span className={`font-semibold ${health.text}`}>{health.label}</span>
              <span className="truncate text-stone-400">
                · {r.owner?.email || 'unknown owner'} · joined {formatDate(r.created_at)}
              </span>
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-stone-300" title="Owner user ID">
              {r.owner_id}
            </p>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={r.plan || 'trial'}
            onChange={(e) => onSetPlan(r, e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-sm font-semibold text-stone-700 focus:border-brand focus:outline-none"
            title="Payment plan"
          >
            {Object.entries(PLANS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
                {p.price > 0 ? ` · $${p.price}/mo` : ''}
              </option>
            ))}
          </select>
          <a href={`/r/${r.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" /> Menu
            </Button>
          </a>
          {r.status === 'pending' && (
            <Button size="sm" onClick={() => onSetStatus(r, 'active')}>
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          )}
          {r.status === 'active' && (
            <Button variant="danger-outline" size="sm" onClick={() => onSetStatus(r, 'suspended')}>
              <Pause className="h-4 w-4" /> Suspend
            </Button>
          )}
          {r.status === 'suspended' && (
            <Button size="sm" onClick={() => onSetStatus(r, 'active')}>
              <Play className="h-4 w-4" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* usage strip */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-stone-400">This week</p>
          <p className="mt-0.5 font-bold text-stone-900">
            {usage?.orders7 || 0} {usage?.orders7 === 1 ? 'order' : 'orders'}
          </p>
          <Trend current={usage?.orders7 || 0} previous={usage?.ordersPrev7 || 0} />
        </div>
        <div>
          <p className="text-stone-400">Last 30 days</p>
          <p className="mt-0.5 font-bold text-stone-900">{formatCurrency(usage?.revenue30 || 0)}</p>
        </div>
        <div>
          <p className="text-stone-400">Lifetime volume</p>
          <p className="mt-0.5 font-bold text-stone-900">{formatCurrency(usage?.revenue || 0)}</p>
        </div>
        <div>
          <p className="text-stone-400">Lifetime orders</p>
          <p className="mt-0.5 font-bold text-stone-900">{usage?.orders || 0}</p>
        </div>
      </div>
    </div>
  )
}
