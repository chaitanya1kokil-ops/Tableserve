import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  LogIn,
  MoreVertical,
  Trash2,
  RefreshCw,
  X,
  Copy,
  AlertTriangle,
  SlidersHorizontal,
  Download,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase, imageUrl } from '../../lib/supabase'
import { formatCurrency, formatDate, timeAgo } from '../../lib/format'
import { RESTAURANT_STATUS } from '../../lib/constants'
import { Button, Badge, Input, FullPageSpinner, EmptyState, Modal } from '../../components/ui'
import { PLANS } from '../../lib/constants'
import { computeAnalytics, clientsToCsv } from '../../lib/adminStats'

const STATUS_FILTERS = ['all', 'pending', 'active', 'suspended']
const DAY_MS = 24 * 60 * 60 * 1000

// Activity filters run against the age (ms) of the client's most recent order.
// `null` age = they have never ordered.
const ACTIVITY_FILTERS = {
  any: { label: 'Any activity', test: () => true },
  today: { label: 'Ordered today', test: (age) => age !== null && age < DAY_MS },
  week: { label: 'Ordered this week', test: (age) => age !== null && age < 7 * DAY_MS },
  quiet: { label: 'Going quiet (3–7d)', test: (age) => age !== null && age >= 3 * DAY_MS && age < 7 * DAY_MS },
  inactive: { label: 'Inactive (7d+)', test: (age) => age !== null && age >= 7 * DAY_MS },
  never: { label: 'Never ordered', test: (age) => age === null },
}

const SORTS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name: 'Name A–Z',
  revenue30: 'Revenue · 30 days',
  orders7: 'Orders · this week',
  lastOrder: 'Most recent order',
  mrr: 'Plan value',
}

// Client health from their most recent order.
function healthOf(lastOrderAt) {
  if (!lastOrderAt) return { label: 'No orders yet', dot: 'bg-stone-300', text: 'text-stone-400' }
  const age = Date.now() - new Date(lastOrderAt).getTime()
  if (age < 1 * DAY_MS) return { label: 'Active today', dot: 'bg-emerald-500', text: 'text-emerald-600' }
  if (age < 3 * DAY_MS) return { label: 'Active this week', dot: 'bg-emerald-400', text: 'text-emerald-600' }
  if (age < 7 * DAY_MS) return { label: 'Quiet', dot: 'bg-amber-400', text: 'text-amber-600' }
  return { label: `Inactive · ${timeAgo(lastOrderAt)}`, dot: 'bg-red-400', text: 'text-red-500' }
}

const trialState = (r) => {
  if (r.plan !== 'trial' || !r.trial_ends_at) return null
  return new Date(r.trial_ends_at) < new Date() ? 'expired' : 'active'
}

export default function Admin() {
  const { profile, session, signOut, impersonate } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Enter a client's dashboard as its owner (admins have full RLS access).
  const openDashboard = (restaurant) => {
    impersonate(restaurant.id)
    navigate('/dashboard')
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [restaurants, setRestaurants] = useState([])
  const [orders, setOrders] = useState([])

  // ---- filters ------------------------------------------------------------
  const [filter, setFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [activity, setActivity] = useState('any')
  const [trialFilter, setTrialFilter] = useState('any')
  const [sort, setSort] = useState('newest')
  const [query, setQuery] = useState('')

  // ---- bulk selection + deletion -----------------------------------------
  const [selected, setSelected] = useState(() => new Set())
  const [deleteTarget, setDeleteTarget] = useState(null) // { ids: [] }
  const [alsoDeleteOwner, setAlsoDeleteOwner] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)

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

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // Export what's on screen, so a filter ("all suspended") doubles as a report.
  const exportCsv = () => {
    const csv = clientsToCsv(filtered, a.perRest)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `tableserve-clients-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? 'client' : 'clients'}.`)
  }

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

  // Apply a status to every selected client in one go.
  const setStatusMany = async (ids, status) => {
    setRestaurants((list) => list.map((r) => (ids.includes(r.id) ? { ...r, status } : r)))
    const { error } = await supabase.from('restaurants').update({ status }).in('id', ids)
    if (error) {
      toast.error(error.message)
      load()
    } else {
      toast.success(`${ids.length} ${ids.length === 1 ? 'client' : 'clients'} ${status === 'active' ? 'activated' : status}.`)
      setSelected(new Set())
    }
  }

  // Deletion goes through the API (it can also remove the owner's login). If
  // that endpoint isn't configured, fall back to a direct RLS delete — admins
  // are allowed to delete restaurants straight from the browser.
  const runDelete = async () => {
    const ids = deleteTarget?.ids || []
    setBusy(true)
    const removed = new Set()
    let ownersRemoved = 0
    const failures = []

    for (const id of ids) {
      const name = restaurants.find((x) => x.id === id)?.name || id
      try {
        const resp = await fetch('/api/admin-delete-restaurant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ restaurantId: id, deleteOwner: alsoDeleteOwner }),
        })
        const json = await resp.json().catch(() => ({}))
        if (!resp.ok) throw new Error(json.error || 'Delete failed.')
        removed.add(id)
        if (json.ownerDeleted) ownersRemoved += 1
      } catch (err) {
        // The endpoint may simply not be configured (no service-role key in this
        // environment). Deleting the restaurant itself still works from here.
        if (alsoDeleteOwner) {
          failures.push(`${name}: ${err.message}`)
          continue
        }
        const { error } = await supabase.from('restaurants').delete().eq('id', id)
        if (error) failures.push(`${name}: ${error.message}`)
        else removed.add(id)
      }
    }

    const done = removed.size
    setRestaurants((list) => list.filter((r) => !removed.has(r.id)))
    setSelected((prev) => {
      const next = new Set(prev)
      removed.forEach((id) => next.delete(id))
      return next
    })

    setBusy(false)
    setDeleteTarget(null)
    setConfirmText('')
    setAlsoDeleteOwner(false)

    if (done) {
      toast.success(
        `Deleted ${done} ${done === 1 ? 'client' : 'clients'}${ownersRemoved ? ` and ${ownersRemoved} owner ${ownersRemoved === 1 ? 'login' : 'logins'}` : ''}.`,
      )
    }
    failures.forEach((f) => toast.error(f))
    if (failures.length) load()
  }

  const copy = (text, what) => {
    navigator.clipboard?.writeText(text)
    toast.success(`${what} copied.`)
  }

  if (loading) return <FullPageSpinner label="Loading platform…" />

  const counts = {
    all: restaurants.length,
    pending: restaurants.filter((r) => r.status === 'pending').length,
    active: restaurants.filter((r) => r.status === 'active').length,
    suspended: restaurants.filter((r) => r.status === 'suspended').length,
  }
  const trialsExpired = restaurants.filter((r) => trialState(r) === 'expired').length
  const neverOrdered = restaurants.filter((r) => !a.perRest[r.id]?.lastOrderAt).length

  const filtersActive =
    filter !== 'all' || planFilter !== 'all' || activity !== 'any' || trialFilter !== 'any' || query.trim() !== ''

  const clearFilters = () => {
    setFilter('all')
    setPlanFilter('all')
    setActivity('any')
    setTrialFilter('any')
    setQuery('')
  }

  // Jump straight to one slice of the book — used by the attention chips.
  const applyPreset = (preset) => {
    clearFilters()
    if (preset === 'pending') setFilter('pending')
    if (preset === 'suspended') setFilter('suspended')
    if (preset === 'trialExpired') setTrialFilter('expired')
    if (preset === 'never') setActivity('never')
  }

  const q = query.trim().toLowerCase()
  const filtered = restaurants
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => planFilter === 'all' || (r.plan || 'trial') === planFilter)
    .filter((r) => {
      const last = a.perRest[r.id]?.lastOrderAt
      const age = last ? Date.now() - new Date(last).getTime() : null
      return ACTIVITY_FILTERS[activity].test(age)
    })
    .filter((r) => trialFilter === 'any' || trialState(r) === trialFilter)
    .filter((r) => {
      if (!q) return true
      return [r.name, r.owner?.email, r.owner?.full_name, r.cuisine, r.address, r.id, r.owner_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
    .sort((x, y) => {
      const ux = a.perRest[x.id] || {}
      const uy = a.perRest[y.id] || {}
      switch (sort) {
        case 'oldest':
          return new Date(x.created_at) - new Date(y.created_at)
        case 'name':
          return x.name.localeCompare(y.name)
        case 'revenue30':
          return (uy.revenue30 || 0) - (ux.revenue30 || 0)
        case 'orders7':
          return (uy.orders7 || 0) - (ux.orders7 || 0)
        case 'lastOrder':
          return new Date(uy.lastOrderAt || 0) - new Date(ux.lastOrderAt || 0)
        case 'mrr':
          return (PLANS[y.plan]?.price || 0) - (PLANS[x.plan]?.price || 0)
        default:
          return new Date(y.created_at) - new Date(x.created_at)
      }
    })

  const filteredIds = filtered.map((r) => r.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id))

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) filteredIds.forEach((id) => next.delete(id))
      else filteredIds.forEach((id) => next.add(id))
      return next
    })

  const deleteNames = (deleteTarget?.ids || [])
    .map((id) => restaurants.find((r) => r.id === id)?.name)
    .filter(Boolean)
  const singleDelete = deleteNames.length === 1
  const confirmWord = singleDelete ? deleteNames[0] : 'DELETE'
  const confirmOk = confirmText.trim().toLowerCase() === confirmWord.toLowerCase()

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
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-stone-500 sm:block">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={refresh} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
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
            delta={a.gmvGrowth}
          />
        </div>

        {/* ------------------------------------------------ secondary metrics */}
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat
            label="Avg revenue / paying client"
            value={formatCurrency(a.arpu)}
            hint={`${a.payingCount} on a paid plan`}
          />
          <MiniStat
            label="Average order value"
            value={formatCurrency(a.aov)}
            hint={`${a.orders30} orders · 30 days`}
            delta={a.ordersGrowth}
          />
          <MiniStat
            label="Trial → paid"
            value={`${a.conversionRate.toFixed(0)}%`}
            hint={`${a.trialCount} still on trial`}
          />
          <MiniStat
            label="MRR at risk"
            value={formatCurrency(a.mrrAtRisk)}
            hint={`${a.suspendedCount} suspended`}
            tone={a.mrrAtRisk > 0 ? 'danger' : undefined}
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
                  <button
                    key={key}
                    onClick={() => setPlanFilter(planFilter === key ? 'all' : key)}
                    className={`w-full rounded-lg px-1.5 py-1 text-left transition hover:bg-stone-50 ${
                      planFilter === key ? 'bg-stone-50 ring-1 ring-stone-200' : ''
                    }`}
                    title={`Filter clients on ${p.label}`}
                  >
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
                  </button>
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

        {/* --------------------------------------- top clients + signup trend */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 lg:col-span-2">
            <h2 className="mb-1 font-display text-lg font-semibold text-stone-900">
              Biggest clients · last 30 days
            </h2>
            <p className="mb-4 text-xs text-stone-400">By order volume running through the platform.</p>
            {a.topClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">No orders in the last 30 days.</p>
            ) : (
              <div className="space-y-2.5">
                {a.topClients.map((c, i) => {
                  const pct = (c.revenue30 / a.topClients[0].revenue30) * 100
                  return (
                    <button
                      key={c.id}
                      onClick={() => setQuery(c.name)}
                      className="w-full rounded-lg px-1.5 py-1 text-left transition hover:bg-stone-50"
                      title={`Find ${c.name}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-4 flex-none text-xs font-bold text-stone-300">
                            {i + 1}
                          </span>
                          <span className="truncate font-medium text-stone-700">{c.name}</span>
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${PLANS[c.plan]?.dot || 'bg-stone-300'}`} />
                        </span>
                        <span className="whitespace-nowrap font-bold tabular-nums text-stone-900">
                          {formatCurrency(c.revenue30)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-brand/70" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
            <h2 className="mb-1 font-display text-lg font-semibold text-stone-900">Signups</h2>
            <p className="mb-4 text-xs text-stone-400">New clients per month.</p>
            <div className="flex h-24 items-end gap-2">
              {a.signups.map((s) => (
                <div
                  key={s.key}
                  className="flex h-full flex-1 flex-col justify-end"
                  title={`${s.label} — ${s.count} ${s.count === 1 ? 'signup' : 'signups'}`}
                >
                  <div
                    className={`w-full rounded-t ${s.count > 0 ? 'bg-blue-400' : 'bg-stone-100'}`}
                    style={{ height: `${s.count > 0 ? Math.max((s.count / a.maxSignup) * 100, 6) : 3}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2 text-center">
              {a.signups.map((s) => (
                <span key={s.key} className="flex-1 text-[10px] text-stone-400">{s.label}</span>
              ))}
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-stone-100 pt-3">
              <span className="text-xs text-stone-400">This month</span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-xl font-semibold text-stone-900">
                  {a.newThisMonth}
                </span>
                {a.newLastMonth > 0 && (
                  <span
                    className={`text-xs font-bold ${a.signupGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {a.signupGrowth >= 0 ? '+' : ''}
                    {a.signupGrowth.toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ needs attention */}
        {(counts.pending > 0 || counts.suspended > 0 || trialsExpired > 0 || neverOrdered > 0) && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Needs attention
            </span>
            {counts.pending > 0 && (
              <AttentionChip
                tone="bg-amber-100 text-amber-800 hover:bg-amber-200"
                onClick={() => applyPreset('pending')}
                label={`${counts.pending} awaiting approval`}
              />
            )}
            {counts.suspended > 0 && (
              <AttentionChip
                tone="bg-red-100 text-red-700 hover:bg-red-200"
                onClick={() => applyPreset('suspended')}
                label={`${counts.suspended} suspended`}
              />
            )}
            {trialsExpired > 0 && (
              <AttentionChip
                tone="bg-orange-100 text-orange-700 hover:bg-orange-200"
                onClick={() => applyPreset('trialExpired')}
                label={`${trialsExpired} expired ${trialsExpired === 1 ? 'trial' : 'trials'}`}
              />
            )}
            {neverOrdered > 0 && (
              <AttentionChip
                tone="bg-stone-200 text-stone-600 hover:bg-stone-300"
                onClick={() => applyPreset('never')}
                label={`${neverOrdered} never ordered`}
              />
            )}
          </div>
        )}

        {/* ------------------------------------------------------- clients */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-stone-900">Clients</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-400">
              {filtered.length} of {restaurants.length} shown
            </span>
            <button
              onClick={exportCsv}
              title="Download the clients currently shown as a spreadsheet"
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* filter bar */}
        <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, owner, email, cuisine, ID…"
                className="pl-9"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                    filter === f ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {f} <span className={filter === f ? 'text-white/60' : 'text-stone-400'}>{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
            <SlidersHorizontal className="hidden h-4 w-4 text-stone-400 sm:block" />
            <FilterSelect value={planFilter} onChange={setPlanFilter} title="Plan">
              <option value="all">All plans</option>
              {Object.entries(PLANS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={activity} onChange={setActivity} title="Activity">
              {Object.entries(ACTIVITY_FILTERS).map(([key, f]) => (
                <option key={key} value={key}>
                  {f.label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={trialFilter} onChange={setTrialFilter} title="Trial">
              <option value="any">Any trial state</option>
              <option value="active">Trial running</option>
              <option value="expired">Trial expired</option>
            </FilterSelect>
            <FilterSelect value={sort} onChange={setSort} title="Sort">
              {Object.entries(SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </FilterSelect>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>

          {filtered.length > 0 && (
            <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-stone-100 pt-3 text-sm text-stone-500">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              Select all {filtered.length} shown
            </label>
          )}
        </div>

        <div className="mt-4 space-y-3 pb-32">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No clients found"
              description={filtersActive ? 'Nothing matches your filters.' : 'No clients yet.'}
              action={
                filtersActive ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : (
            filtered.map((r) => (
              <ClientCard
                key={r.id}
                restaurant={r}
                usage={a.perRest[r.id]}
                selected={selected.has(r.id)}
                onToggleSelect={() => toggleSelect(r.id)}
                onSetStatus={setStatus}
                onSetPlan={setPlan}
                onOpen={openDashboard}
                onDelete={() => {
                  setDeleteTarget({ ids: [r.id] })
                  setConfirmText('')
                  setAlsoDeleteOwner(false)
                }}
                onCopy={copy}
              />
            ))
          )}
        </div>
      </div>

      {/* --------------------------------------------------- bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,.06)] backdrop-blur safe-bottom">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <span className="font-semibold text-stone-900">
              {selected.size} selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm font-semibold text-stone-400 hover:text-stone-700"
            >
              Clear
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatusMany([...selected], 'active')}>
                <Play className="h-4 w-4" /> Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatusMany([...selected], 'suspended')}>
                <Pause className="h-4 w-4" /> Suspend
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setDeleteTarget({ ids: [...selected] })
                  setConfirmText('')
                  setAlsoDeleteOwner(false)
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- delete modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !busy && setDeleteTarget(null)}
        title={singleDelete ? 'Delete client' : `Delete ${deleteNames.length} clients`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={runDelete} disabled={!confirmOk} loading={busy}>
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>
              This permanently deletes the {singleDelete ? 'restaurant' : 'restaurants'} along with every menu,
              table, QR code, order and payment record. It cannot be undone.
            </p>
          </div>

          {!singleDelete && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
              {deleteNames.map((n) => (
                <li key={n} className="truncate">• {n}</li>
              ))}
            </ul>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 p-3 text-sm">
            <input
              type="checkbox"
              checked={alsoDeleteOwner}
              onChange={(e) => setAlsoDeleteOwner(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            />
            <span>
              <span className="font-semibold text-stone-800">Also delete the owner's login</span>
              <span className="block text-stone-500">
                Frees up their email so they can sign up again from scratch. Skipped if that owner still has
                another restaurant.
              </span>
            </span>
          </label>

          <div>
            <p className="mb-1.5 text-sm text-stone-600">
              Type <span className="font-mono font-bold text-stone-900">{confirmWord}</span> to confirm.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------ analytics -- */
/* ------------------------------------------------------------ components -- */
function StatCard({ icon: Icon, tint, value, label, delta }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
      <div className="mb-2 flex items-start justify-between">
        <div className={`inline-flex rounded-xl p-2 ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta !== undefined && Number.isFinite(delta) && <DeltaTag value={delta} />}
      </div>
      <p className="font-display text-2xl font-semibold text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  )
}

// Change against the previous equivalent window. Neutral at exactly flat, so a
// quiet week doesn't read as either good or bad news.
function DeltaTag({ value }) {
  const tone =
    value > 0 ? 'bg-emerald-50 text-emerald-700'
    : value < 0 ? 'bg-red-50 text-red-600'
    : 'bg-stone-100 text-stone-500'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tone}`}>
      {value > 0 ? '+' : ''}
      {value.toFixed(0)}%
    </span>
  )
}

function MiniStat({ label, value, hint, delta, tone }) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
        tone === 'danger' ? 'ring-red-200' : 'ring-stone-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-stone-400">{label}</p>
        {delta !== undefined && Number.isFinite(delta) && <DeltaTag value={delta} />}
      </div>
      <p
        className={`mt-1.5 font-display text-xl font-semibold ${
          tone === 'danger' ? 'text-red-600' : 'text-stone-900'
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  )
}

function AttentionChip({ tone, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold transition ${tone}`}
    >
      {label}
    </button>
  )
}

function FilterSelect({ value, onChange, title, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={title}
      className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-stone-700 focus:border-brand focus:outline-none"
    >
      {children}
    </select>
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

// Overflow menu for the actions that shouldn't take up a button each.
function RowMenu({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, children, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-700 hover:bg-stone-50'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {children}
    </button>
  )
}

function ClientCard({
  restaurant: r,
  usage,
  selected,
  onToggleSelect,
  onSetStatus,
  onSetPlan,
  onOpen,
  onDelete,
  onCopy,
}) {
  const status = RESTAURANT_STATUS[r.status] || RESTAURANT_STATUS.active
  const plan = PLANS[r.plan] || PLANS.trial
  const health = healthOf(usage?.lastOrderAt)
  const trialEnds = r.plan === 'trial' && r.trial_ends_at ? new Date(r.trial_ends_at) : null
  const trialExpired = trialEnds && trialEnds < new Date()

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition ${
        selected ? 'ring-2 ring-stone-900' : 'ring-stone-100 hover:ring-stone-200'
      } ${r.status === 'suspended' ? 'opacity-90' : ''}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* identity */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 flex-shrink-0 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            aria-label={`Select ${r.name}`}
          />
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
          <Button size="sm" variant="outline" onClick={() => onOpen(r)} title="Open this client's dashboard as its owner">
            <LogIn className="h-4 w-4" /> Open
          </Button>
          {r.status === 'pending' && (
            <Button size="sm" onClick={() => onSetStatus(r, 'active')}>
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          )}
          {r.status === 'suspended' && (
            <Button size="sm" onClick={() => onSetStatus(r, 'active')}>
              <Play className="h-4 w-4" /> Reactivate
            </Button>
          )}
          <RowMenu>
            <MenuItem icon={ExternalLink} onClick={() => window.open(`/r/${r.id}`, '_blank', 'noreferrer')}>
              View public menu
            </MenuItem>
            {r.status === 'active' && (
              <MenuItem icon={Pause} onClick={() => onSetStatus(r, 'suspended')}>
                Suspend
              </MenuItem>
            )}
            {r.status !== 'pending' && r.status !== 'active' && (
              <MenuItem icon={Pause} onClick={() => onSetStatus(r, 'pending')}>
                Move back to pending
              </MenuItem>
            )}
            <MenuItem icon={Copy} onClick={() => onCopy(r.owner?.email || '', 'Owner email')}>
              Copy owner email
            </MenuItem>
            <MenuItem icon={Copy} onClick={() => onCopy(r.id, 'Restaurant ID')}>
              Copy restaurant ID
            </MenuItem>
            <MenuItem icon={Copy} onClick={() => onCopy(r.owner_id, 'Owner user ID')}>
              Copy owner user ID
            </MenuItem>
            <div className="my-1 border-t border-stone-100" />
            <MenuItem icon={Trash2} danger onClick={onDelete}>
              Delete client…
            </MenuItem>
          </RowMenu>
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
