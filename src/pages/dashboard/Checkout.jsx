import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Wallet, Receipt, Banknote, CreditCard, Plus, Trash2, X, HandCoins, Gift } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatTime } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { Button, Badge, FullPageSpinner, EmptyState, Select } from '../../components/ui'

const METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'other', label: 'Other', icon: HandCoins },
]

const round2 = (n) => Math.round(n * 100) / 100

// Split a total into n even parts that sum exactly to the total.
function evenSplit(total, n) {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  return Array.from({ length: n }, (_, i) => ((base + (i === 0 ? cents - base * n : 0)) / 100).toFixed(2))
}

export default function Checkout() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState(null) // table key being settled
  const reloadTimer = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*), table:tables(label)')
      .eq('restaurant_id', rid)
      .is('paid_at', null)
      .not('status', 'in', '(cancelled,completed)')
      .order('created_at')
    if (error) {
      toast.error(
        /paid_at/.test(error.message)
          ? 'Run migration 0005_payments.sql in Supabase to enable checkout.'
          : error.message,
      )
      setLoading(false)
      return
    }
    setOrders(data || [])
    setLoading(false)
  }, [rid]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`checkout-${rid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rid}` },
        () => {
          clearTimeout(reloadTimer.current)
          reloadTimer.current = setTimeout(load, 200)
        },
      )
      .subscribe()
    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(channel)
    }
  }, [rid, load])

  const tabs = useMemo(() => {
    const byTable = {}
    for (const o of orders) {
      const key = o.table_id || 'none'
      ;(byTable[key] ||= { key, label: o.table?.label || 'No table', orders: [] }).orders.push(o)
    }
    return Object.values(byTable)
      .map((t) => ({
        ...t,
        subtotal: t.orders.reduce((s, o) => s + Number(o.subtotal ?? o.total ?? 0), 0),
        tax: t.orders.reduce((s, o) => s + Number(o.tax || 0), 0),
        total: t.orders.reduce((s, o) => s + Number(o.total || 0), 0),
        itemCount: t.orders.reduce(
          (n, o) => n + (o.items || []).reduce((a, it) => a + (it.quantity || 0), 0),
          0,
        ),
        billRequested: t.orders.some((o) => o.bill_requested),
        openedAt: t.orders[0]?.created_at,
      }))
      // A tab is ready for payment only once every round has been served —
      // until then the table still belongs to the kitchen/floor workflow.
      .filter((t) => t.orders.every((o) => o.status === 'served'))
      .sort((a, b) => Number(b.billRequested) - Number(a.billRequested))
  }, [orders])

  const selected = tabs.find((t) => t.key === activeTab)

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Checkout</h1>
        <p className="mt-1 text-sm text-stone-500">
          Tables appear here once all their orders are marked served. Take payment to close them.
        </p>
      </div>

      {loading ? (
        <FullPageSpinner label="Loading open tabs…" />
      ) : tabs.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No tabs ready for payment"
          description="A table shows up here once every one of its orders has been marked served on the Orders board."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                t.billRequested ? 'ring-2 ring-orange-300' : 'ring-1 ring-stone-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900">{t.label}</span>
                {t.billRequested && (
                  <Badge className="bg-orange-100 text-orange-700">
                    <Receipt className="h-3 w-3" /> Bill requested
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-400">
                {t.orders.length} {t.orders.length === 1 ? 'round' : 'rounds'} · {t.itemCount}{' '}
                {t.itemCount === 1 ? 'item' : 'items'} · since {formatTime(t.openedAt)}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-xs text-stone-400">Total incl. tax</span>
                <span className="font-display text-xl font-semibold text-stone-900">
                  {formatCurrency(t.total, currency)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <SettleModal
          tab={selected}
          currency={currency}
          onClose={() => setActiveTab(null)}
          onSettled={() => {
            setActiveTab(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function SettleModal({ tab, currency, onClose, onSettled }) {
  const toast = useToast()
  const [payments, setPayments] = useState([
    { method: 'cash', amount: tab.total.toFixed(2), tip: '' },
  ])
  const [tendered, setTendered] = useState('')
  const [settling, setSettling] = useState(false)
  const [rewardMembers, setRewardMembers] = useState([]) // members on this tab with rewards
  const [reward, setReward] = useState(null) // { memberId, itemId } | null

  // Any loyalty members linked to this tab who have a banked reward?
  useEffect(() => {
    const ids = [...new Set(tab.orders.map((o) => o.loyalty_member_id).filter(Boolean))]
    if (ids.length === 0) return
    supabase
      .from('loyalty_members')
      .select('id, name, email, visits, rewards_redeemed')
      .in('id', ids)
      .then(({ data }) => {
        const withRewards = (data || []).filter(
          (m) => Math.floor((m.visits || 0) / 10) - (m.rewards_redeemed || 0) > 0,
        )
        setRewardMembers(withRewards)
      })
  }, [tab])

  const allItems = tab.orders.flatMap((o) => o.items || [])
  const rewardItem = reward ? allItems.find((it) => it.id === reward.itemId) : null
  const compAmount = rewardItem ? round2(Number(rewardItem.line_total) || 0) : 0
  const due = round2(tab.total - compAmount)

  const paidSum = round2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const balanced = paidSum === due
  const singleCash = payments.length === 1 && payments[0].method === 'cash'
  const change =
    singleCash && tendered !== '' ? round2(Number(tendered) - (Number(payments[0].amount) || 0)) : null

  const setPayment = (i, patch) =>
    setPayments((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const addSplit = () => {
    const amounts = evenSplit(due, payments.length + 1)
    setPayments((ps) => [...ps, { method: 'card', amount: '', tip: '' }].map((p, i) => ({ ...p, amount: amounts[i] })))
  }

  const removePayment = (i) => {
    const next = payments.filter((_, idx) => idx !== i)
    const amounts = evenSplit(due, next.length)
    setPayments(next.map((p, idx) => ({ ...p, amount: amounts[idx] })))
  }

  const applyReward = (memberId, itemId) => {
    setReward(memberId ? { memberId, itemId } : null)
    // Reset payment amounts to the new amount due.
    const item = itemId ? allItems.find((it) => it.id === itemId) : null
    const comp = item ? round2(Number(item.line_total) || 0) : 0
    setPayments([{ method: 'cash', amount: round2(tab.total - comp).toFixed(2), tip: '' }])
  }

  const settle = async () => {
    if (!balanced) return
    setSettling(true)
    const { error } = await supabase.rpc('settle_tab', {
      p_table_id: tab.key === 'none' ? null : tab.key,
      p_order_ids: tab.orders.map((o) => o.id),
      p_payments: payments.map((p) => ({
        method: p.method,
        amount: round2(Number(p.amount) || 0),
        tip: round2(Number(p.tip) || 0),
      })),
      p_reward: reward ? { member_id: reward.memberId, order_item_id: reward.itemId } : null,
    })
    setSettling(false)
    if (error) return toast.error(error.message || 'Could not settle the tab.')
    toast.success(reward ? `${tab.label} paid — reward redeemed 🎁` : `${tab.label} paid 🎉`)
    onSettled()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-display text-xl font-semibold text-stone-900">
            Pay {tab.label}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Tab summary */}
          <div className="space-y-3">
            {tab.orders.map((o, i) => (
              <div key={o.id}>
                <p className="mb-1 text-xs font-semibold text-stone-400">
                  {tab.orders.length > 1 ? `Round ${i + 1} · ` : ''}
                  {formatTime(o.created_at)}
                </p>
                <div className="space-y-1">
                  {(o.items || []).map((it) => (
                    <div key={it.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-stone-700">
                        <span className="font-semibold">{it.quantity}×</span> {it.name_snapshot}
                      </span>
                      <span className="whitespace-nowrap text-stone-500">
                        {formatCurrency(it.line_total, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
            {tab.tax > 0 && (
              <>
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(tab.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Tax</span>
                  <span>{formatCurrency(tab.tax, currency)}</span>
                </div>
              </>
            )}
            {compAmount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span className="flex items-center gap-1.5">
                  <Gift className="h-4 w-4" /> Reward: {rewardItem?.name_snapshot}
                </span>
                <span>−{formatCurrency(compAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base">
              <span className="font-semibold text-stone-700">Amount due</span>
              <span className="font-display text-lg font-semibold text-stone-900">
                {formatCurrency(due, currency)}
              </span>
            </div>
          </div>

          {/* Loyalty reward on this tab */}
          {rewardMembers.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              {rewardMembers.map((m) => {
                const avail = Math.floor((m.visits || 0) / 10) - (m.rewards_redeemed || 0)
                const active = reward?.memberId === m.id
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                        <Gift className="h-4 w-4" />
                        {m.name || m.email} has {avail} free {avail === 1 ? 'item' : 'items'}
                      </span>
                      <button
                        onClick={() =>
                          active ? applyReward(null, null) : applyReward(m.id, allItems[0]?.id)
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          active
                            ? 'bg-white text-amber-700 ring-1 ring-amber-300'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {active ? 'Remove' : 'Apply free item'}
                      </button>
                    </div>
                    {active && (
                      <select
                        value={reward.itemId || ''}
                        onChange={(e) => applyReward(m.id, e.target.value)}
                        className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm font-medium text-stone-700 focus:outline-none"
                      >
                        {allItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name_snapshot} · {formatCurrency(it.line_total, currency)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Payments */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-bold text-stone-900">Payment</h4>
              <button
                onClick={addSplit}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-stone-50"
              >
                <Plus className="h-3.5 w-3.5" /> Split payment
              </button>
            </div>
            <div className="space-y-2.5">
              {payments.map((p, i) => (
                <div key={i} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1">
                      {METHODS.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setPayment(i, { method: m.key })}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            p.method === m.key
                              ? 'bg-brand text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          <m.icon className="h-3.5 w-3.5" /> {m.label}
                        </button>
                      ))}
                    </div>
                    {payments.length > 1 && (
                      <button
                        onClick={() => removePayment(i)}
                        className="ml-auto rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-stone-500">
                      Amount
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.amount}
                        onChange={(e) => setPayment(i, { amount: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-brand"
                      />
                    </label>
                    <label className="text-xs font-medium text-stone-500">
                      Tip (optional)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.tip}
                        onChange={(e) => setPayment(i, { tip: e.target.value })}
                        placeholder="0.00"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-brand"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {singleCash && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                <label className="flex-1 text-xs font-medium text-stone-500">
                  Cash received
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    placeholder={due.toFixed(2)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-brand"
                  />
                </label>
                {change !== null && (
                  <div className="text-right">
                    <p className="text-xs text-stone-400">Change due</p>
                    <p className={`font-display text-lg font-semibold ${change < 0 ? 'text-red-500' : 'text-stone-900'}`}>
                      {formatCurrency(Math.max(change, 0), currency)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!balanced && (
              <p className="mt-2 text-xs font-medium text-red-500">
                Payments total {formatCurrency(paidSum, currency)} but{' '}
                {formatCurrency(due, currency)} is due.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 safe-bottom">
          <Button className="w-full" size="lg" loading={settling} disabled={!balanced} onClick={settle}>
            <Wallet className="h-4 w-4" />
            Pay {formatCurrency(due, currency)}
          </Button>
        </div>
      </div>
    </div>
  )
}
