import { useEffect, useState, useCallback } from 'react'
import { Star, Search, Download, Gift, Users, Trash2, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/format'
import { Button, Badge, Input, FullPageSpinner, EmptyState } from '../../components/ui'

const rewardsAvailable = (m) => Math.max(Math.floor((m.visits || 0) / 10) - (m.rewards_redeemed || 0), 0)

export default function Loyalty() {
  const { restaurant, refreshRestaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [query, setQuery] = useState('')
  const [minSpend, setMinSpend] = useState(restaurant.loyalty_min_spend ?? 0)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('loyalty_members')
      .select('*')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setMembers(data || [])
    setLoading(false)
  }, [rid]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  const redeem = async (m) => {
    if (!confirm(`Redeem one free item for ${m.name || m.email}?`)) return
    setMembers((list) =>
      list.map((x) => (x.id === m.id ? { ...x, rewards_redeemed: x.rewards_redeemed + 1 } : x)),
    )
    const { error } = await supabase
      .from('loyalty_members')
      .update({ rewards_redeemed: m.rewards_redeemed + 1 })
      .eq('id', m.id)
    if (error) {
      toast.error(error.message)
      load()
    } else {
      toast.success('Reward redeemed 🎁')
    }
  }

  const remove = async (m) => {
    if (!confirm(`Remove ${m.email} from the program? This deletes their visits too.`)) return
    setMembers((list) => list.filter((x) => x.id !== m.id))
    const { error } = await supabase.from('loyalty_members').delete().eq('id', m.id)
    if (error) {
      toast.error(error.message)
      load()
    }
  }

  const saveMinSpend = async () => {
    const v = Number(minSpend)
    if (Number.isNaN(v) || v < 0) return toast.error('Enter a valid amount.')
    const { error } = await supabase
      .from('restaurants')
      .update({ loyalty_min_spend: v })
      .eq('id', rid)
    if (error) return toast.error(error.message)
    await refreshRestaurant()
    toast.success('Minimum spend saved.')
  }

  const exportCsv = () => {
    const rows = [
      ['name', 'email', 'visits', 'rewards_available', 'rewards_redeemed', 'consented_at', 'joined'],
      ...members.map((m) => [
        m.name || '',
        m.email,
        m.visits,
        rewardsAvailable(m),
        m.rewards_redeemed,
        m.consented_at || '',
        m.created_at,
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `loyalty-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <FullPageSpinner label="Loading members…" />

  const filtered = members.filter(
    (m) =>
      (m.name || '').toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()),
  )
  const outstanding = members.reduce((s, m) => s + rewardsAvailable(m), 0)
  const totalVisits = members.reduce((s, m) => s + (m.visits || 0), 0)

  const stats = [
    { label: 'Members', value: members.length, icon: Users, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Total visits', value: totalVisits, icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rewards outstanding', value: outstanding, icon: Gift, tint: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Loyalty</h1>
          <p className="mt-1 text-sm text-stone-500">
            {restaurant.loyalty_brand ? (
              <>
                Rewards active for <strong>{restaurant.loyalty_brand}</strong> · every 10th paid
                visit earns a free item.
              </>
            ) : (
              'Rewards program is not enabled for this restaurant.'
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={members.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
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

      {/* Program settings */}
      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-sm font-semibold text-stone-700">
              Minimum spend per visit ({restaurant.currency})
            </p>
            <p className="mb-2 text-xs text-stone-400">
              A sitting only counts as a visit when the member’s paid orders reach this amount.
              0 = any paid order counts.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={minSpend}
                onChange={(e) => setMinSpend(e.target.value)}
                className="w-32"
              />
              <Button size="sm" onClick={saveMinSpend}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold text-stone-900">
          Members <span className="text-stone-400">({members.length})</span>
        </h2>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No members yet"
            description="Guests join from the rewards popup on your menu. Their names and emails collect here."
          />
        ) : (
          filtered.map((m) => {
            const avail = rewardsAvailable(m)
            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-stone-900">{m.name || 'Unnamed'}</p>
                    {avail > 0 && (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Gift className="h-3 w-3" /> {avail} reward{avail === 1 ? '' : 's'}
                      </Badge>
                    )}
                    {!m.consented_at && (
                      <Badge className="bg-stone-100 text-stone-500">no marketing consent</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {m.email} · {m.visits} {m.visits === 1 ? 'visit' : 'visits'} ·{' '}
                    {m.rewards_redeemed} redeemed · joined {formatDate(m.created_at)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {avail > 0 && (
                    <Button size="sm" onClick={() => redeem(m)}>
                      <Gift className="h-4 w-4" /> Redeem
                    </Button>
                  )}
                  <button
                    onClick={() => remove(m)}
                    className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
