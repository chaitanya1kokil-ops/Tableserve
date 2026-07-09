import { useEffect, useState, useCallback } from 'react'
import {
  Store,
  LogOut,
  Building2,
  CheckCircle2,
  ShoppingBag,
  TrendingUp,
  Search,
  ShieldCheck,
  Pause,
  Play,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase, imageUrl } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/format'
import { RESTAURANT_STATUS } from '../../lib/constants'
import { Button, Card, Badge, Input, FullPageSpinner, EmptyState } from '../../components/ui'

const STATUS_FILTERS = ['all', 'pending', 'active', 'suspended']

export default function Admin() {
  const { profile, signOut } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState([])
  const [stats, setStats] = useState({ orders: 0, revenue: 0 })
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const [{ data: rests }, { count }, { data: totals }] = await Promise.all([
      supabase
        .from('restaurants')
        .select('*, owner:profiles!restaurants_owner_id_fkey(email, full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total, status'),
    ])
    setRestaurants(rests || [])
    const revenue = (totals || [])
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total || 0), 0)
    setStats({ orders: count || 0, revenue })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

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

  const statCards = [
    { label: 'Restaurants', value: restaurants.length, icon: Building2, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Active', value: counts.active, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total orders', value: stats.orders, icon: ShoppingBag, tint: 'bg-violet-50 text-violet-600' },
    { label: 'Platform revenue', value: formatCurrency(stats.revenue), icon: TrendingUp, tint: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-extrabold text-gray-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gray-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            TableServe <span className="text-gray-400">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform overview</h1>
        <p className="text-sm text-gray-500">Manage every restaurant on TableServe.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-4">
              <div className={`mb-2 inline-flex rounded-xl p-2 ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {f} <span className="text-gray-400">{counts[f]}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants…"
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No restaurants found" description="Nothing matches your filter." />
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <RestaurantRow key={r.id} restaurant={r} onSetStatus={setStatus} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RestaurantRow({ restaurant: r, onSetStatus }) {
  const status = RESTAURANT_STATUS[r.status] || RESTAURANT_STATUS.active

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
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
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-gray-900">{r.name}</p>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
          <p className="truncate text-xs text-gray-500">
            {r.cuisine} · {r.owner?.email || 'unknown owner'} · joined {formatDate(r.created_at)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={`/r/${r.id}`} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            View
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
    </Card>
  )
}
