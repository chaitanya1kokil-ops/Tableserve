import { useEffect, useState, useCallback } from 'react'
import { Star, Search, Download, Gift, Users, Trash2, TrendingUp, Sparkles, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/format'
import { Button, Badge, Input, Field, FullPageSpinner, EmptyState } from '../../components/ui'
import { allowsLoyalty, PLANS } from '../../lib/constants'

export default function Loyalty() {
  const { restaurant, refreshRestaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const rewardEvery = restaurant.loyalty_reward_every || 10
  const rewardsAvailable = (m) =>
    Math.max(Math.floor((m.visits || 0) / rewardEvery) - (m.rewards_redeemed || 0), 0)

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [query, setQuery] = useState('')

  // Program setup form state
  const [enabled, setEnabled] = useState(!!restaurant.loyalty_brand)
  const [brand, setBrand] = useState(restaurant.loyalty_brand || restaurant.name || '')
  const [reward, setReward] = useState(restaurant.loyalty_reward || '')
  const [every, setEvery] = useState(restaurant.loyalty_reward_every || 10)
  const [minSpend, setMinSpend] = useState(restaurant.loyalty_min_spend ?? 0)
  const [saving, setSaving] = useState(false)

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

  const saveProgram = async () => {
    let payload
    if (enabled) {
      if (!brand.trim()) return toast.error('Give your rewards program a name.')
      if (!reward.trim()) return toast.error('Describe the reward guests earn.')
      const ev = parseInt(every, 10)
      if (!ev || ev < 1 || ev > 100) return toast.error('Visits to earn a reward must be 1–100.')
      const ms = Number(minSpend)
      if (Number.isNaN(ms) || ms < 0) return toast.error('Enter a valid minimum spend.')
      payload = {
        loyalty_brand: brand.trim(),
        loyalty_reward: reward.trim(),
        loyalty_reward_every: ev,
        loyalty_min_spend: ms,
      }
    } else {
      payload = { loyalty_brand: null } // clearing the name switches the program off
    }
    setSaving(true)
    const { error } = await supabase.from('restaurants').update(payload).eq('id', rid)
    setSaving(false)
    if (error) return toast.error(error.message)
    await refreshRestaurant()
    toast.success(enabled ? 'Rewards program saved. 🎉' : 'Rewards program turned off.')
  }

  const redeem = async (m) => {
    if (!confirm(`Redeem "${restaurant.loyalty_reward || 'the reward'}" for ${m.name || m.email}?`)) return
    const { error } = await supabase.rpc('redeem_reward', { p_member: m.id })
    if (error) toast.error(error.message)
    else toast.success('Reward redeemed 🎁')
    load()
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

  const exportCsv = () => {
    const consented = members.filter((m) => m.consented_at)
    if (consented.length === 0) return toast.error('No consented members to export yet.')
    const rows = [
      ['name', 'email', 'visits', 'rewards_available', 'rewards_redeemed', 'consented_at', 'joined'],
      ...consented.map((m) => [
        m.name || '',
        m.email,
        m.visits,
        rewardsAvailable(m),
        m.rewards_redeemed,
        m.consented_at || '',
        m.created_at,
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `loyalty-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <FullPageSpinner label="Loading loyalty…" />

  // Loyalty is a Pro/Premium feature (and always on for food trucks).
  if (!allowsLoyalty(restaurant)) {
    return (
      <div className="pb-8">
        <div className="mb-5">
          <h1 className="font-display text-3xl font-semibold text-stone-900">Loyalty</h1>
          <p className="mt-1 text-sm text-stone-500">Rewards keep your guests coming back.</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-stone-900 p-8 text-center text-white">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(180,83,9,.5), transparent 60%)' }} />
          <div className="relative mx-auto max-w-md">
            <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <Star className="h-6 w-6 text-amber-300" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold">Rewards is a Pro feature</h2>
            <p className="mt-2 text-sm text-white/70">
              Run a punch-card rewards program, collect a customer email list, and bring guests back.
              Available on the <strong>Pro</strong> (${PLANS.pro.price}/mo) and <strong>Premium</strong>{' '}
              plans. Upgrade from the <strong>Subscription</strong> tab.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const filtered = members.filter(
    (m) =>
      (m.name || '').toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()),
  )
  const outstanding = members.reduce((s, m) => s + rewardsAvailable(m), 0)
  const totalVisits = members.reduce((s, m) => s + (m.visits || 0), 0)
  const isLive = !!restaurant.loyalty_brand

  const stats = [
    { label: 'Members', value: members.length, icon: Users, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Total visits', value: totalVisits, icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rewards outstanding', value: outstanding, icon: Gift, tint: 'bg-amber-50 text-amber-600' },
  ]

  const previewReward = reward.trim() || 'a free item'
  const previewBrand = brand.trim() || restaurant.name

  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Loyalty</h1>
          <p className="mt-1 text-sm text-stone-500">
            {isLive ? (
              <>
                Live for <strong>{restaurant.loyalty_brand}</strong> · every {rewardEvery} visits earns{' '}
                <strong>{restaurant.loyalty_reward || 'a reward'}</strong>.
              </>
            ) : (
              'Set up a punch-card rewards program to bring guests back.'
            )}
          </p>
        </div>
        {isLive && (
          <div className="text-right">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={members.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <p className="mt-1 text-[11px] text-stone-400">Consented members only</p>
          </div>
        )}
      </div>

      {/* Program setup */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-900">Rewards program</h2>
            <p className="text-sm text-stone-500">
              {enabled ? 'Guests earn a reward after a set number of visits.' : 'Turned off — guests won’t see a rewards popup.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition ${enabled ? 'bg-brand' : 'bg-stone-300'}`}
            aria-label="Toggle rewards program"
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        {enabled && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Program name" hint="Shown to guests on the join popup.">
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={restaurant.name} />
              </Field>
              <Field label="Visits to earn a reward">
                <Input type="number" min="1" max="100" value={every} onChange={(e) => setEvery(e.target.value)} />
              </Field>
              <Field label="Reward guests earn" hint="Be specific — this is what they see and claim.">
                <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g. A free regular paan" />
              </Field>
              <Field label={`Minimum spend per visit (${restaurant.currency})`} hint="0 = any paid order counts as a visit.">
                <Input type="number" min="0" step="0.01" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
              </Field>
            </div>

            {/* Live customer preview */}
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-3.5 w-3.5" /> What guests see
              </p>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-amber-100">
                <p className="flex items-center gap-2 font-bold text-stone-900">
                  <Gift className="h-4 w-4 text-amber-500" /> Join {previewBrand} Rewards
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Earn <strong>{previewReward}</strong> every <strong>{Number(every) || rewardEvery}</strong> visits.
                  After joining they’ll see “{Math.max((Number(every) || rewardEvery) - 1, 0)} visits to {previewReward}.”
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="mt-4 flex gap-2 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
              <div>
                <p className="font-semibold text-stone-700">How it works</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Guests join from a popup on your menu (name + email, with consent).</li>
                  <li>Each paid order counts as one visit (once per sitting, and only if it meets the minimum spend).</li>
                  <li>After {Number(every) || rewardEvery} visits, they’ve earned their reward.</li>
                  <li>Staff tap <strong>Redeem</strong> below when the guest claims it.</li>
                </ul>
              </div>
            </div>
          </>
        )}

        <div className="mt-5">
          <Button onClick={saveProgram} loading={saving}>
            {enabled ? (isLive ? 'Save changes' : 'Turn on rewards') : 'Save'}
          </Button>
        </div>
      </div>

      {isLive ? (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-xl font-semibold text-stone-900">
              Members <span className="text-stone-400">({members.length})</span>
            </h2>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" className="pl-9" />
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
                  <div key={m.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-stone-900">{m.name || 'Unnamed'}</p>
                        {avail > 0 && (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Gift className="h-3 w-3" /> {avail} reward{avail === 1 ? '' : 's'}
                          </Badge>
                        )}
                        {!m.consented_at && <Badge className="bg-stone-100 text-stone-500">no marketing consent</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {m.email} · {m.visits} {m.visits === 1 ? 'visit' : 'visits'} · {m.rewards_redeemed} redeemed · joined{' '}
                        {formatDate(m.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {avail > 0 && (
                        <Button size="sm" onClick={() => redeem(m)}>
                          <Gift className="h-4 w-4" /> Redeem
                        </Button>
                      )}
                      <button onClick={() => remove(m)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" title="Remove member">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-200 p-8 text-center">
          <Star className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 font-semibold text-stone-600">Your rewards program is off</p>
          <p className="text-sm text-stone-400">
            Turn it on above to start collecting members. They’ll join from a popup on your menu.
          </p>
        </div>
      )}
    </div>
  )
}
