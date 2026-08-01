import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Wallet, Receipt, Banknote, CreditCard, Plus, Trash2, X, HandCoins, Gift, ShoppingBag, Check, Pencil } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatTime } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { Button, Badge, FullPageSpinner, EmptyState, Select } from '../../components/ui'
import EditOrderModal from './EditOrderModal'
import {
  round2,
  evenSplit,
  toUnits,
  amountsFromAssignment,
  itemOwners,
  collectionState,
} from '../../lib/split'

const METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'other', label: 'Other', icon: HandCoins },
]

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
    const groups = {}
    for (const o of orders) {
      // Takeout/counter orders carry a customer name and are paid individually;
      // dine-in orders are grouped by their table into one running tab.
      const key = o.customer_name ? `c:${o.id}` : `t:${o.table_id || 'none'}`
      ;(groups[key] ||= {
        key,
        label: o.customer_name || o.table?.label || 'No table',
        name: o.customer_name || null,
        counterLabel: o.customer_name ? o.table?.label || null : null,
        tableId: o.table_id || null,
        orders: [],
      }).orders.push(o)
    }
    return Object.values(groups)
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
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-bold text-stone-900">{t.label}</span>
                {t.name ? (
                  <Badge className="flex-shrink-0 bg-violet-100 text-violet-700">
                    <ShoppingBag className="h-3 w-3" /> Takeout
                  </Badge>
                ) : t.billRequested ? (
                  <Badge className="flex-shrink-0 bg-orange-100 text-orange-700">
                    <Receipt className="h-3 w-3" /> Bill requested
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-stone-400">
                {t.counterLabel ? `${t.counterLabel} · ` : ''}
                {t.orders.length} {t.orders.length === 1 ? 'order' : 'orders'} · {t.itemCount}{' '}
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
          restaurant={restaurant}
          currency={currency}
          onClose={() => setActiveTab(null)}
          onEdited={load}
          onSettled={() => {
            setActiveTab(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function SettleModal({ tab, restaurant, currency, onClose, onEdited, onSettled }) {
  const toast = useToast()
  // A tab reaches Checkout only once every round is served — which is exactly
  // when a dish comes back. Corrections have to be reachable from here, not
  // just from the active board.
  const [editingOrder, setEditingOrder] = useState(null)
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

  const [splitMode, setSplitMode] = useState('even') // 'even' | 'item'
  const [assignment, setAssignment] = useState({}) // unit key -> payer index
  // Money comes in one payer at a time. This tracks who has actually handed it
  // over, so staff can work down the table; the tab is written in one atomic
  // settle at the end (settle_tab is all-or-nothing by design).
  const [collected, setCollected] = useState([])

  const allItems = tab.orders.flatMap((o) => o.items || [])
  const rewardItem = reward ? allItems.find((it) => it.id === reward.itemId) : null
  const compAmount = rewardItem ? round2(Number(rewardItem.line_total) || 0) : 0
  const due = round2(tab.total - compAmount)

  const units = useMemo(() => toUnits(tab.orders, reward?.itemId), [tab.orders, reward])
  const unassigned = splitMode === 'item' ? units.filter((u) => assignment[u.key] == null).length : 0

  // In item mode the amounts are derived from the assignment, not typed.
  const itemSplit = useMemo(
    () => amountsFromAssignment(units, assignment, payments.length, due),
    [units, assignment, payments.length, due],
  )
  const byItem = splitMode === 'item'
  const effective = byItem ? payments.map((p, i) => ({ ...p, amount: itemSplit.amounts[i] })) : payments

  const paidSum = round2(effective.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const { split, outstanding, collectedTotal, allCollected } = collectionState(effective, collected)
  // A split tab can only be closed once every payer has actually paid.
  const balanced = paidSum === due && (!byItem || unassigned === 0) && allCollected
  const singleCash = effective.length === 1 && effective[0].method === 'cash'
  const change =
    singleCash && tendered !== ''
      ? round2(Number(tendered) - (Number(effective[0].amount) || 0))
      : null

  // If any amount moves — an item reassigned, a figure retyped, a payer added —
  // an earlier "collected" mark no longer refers to what that person owes.
  const amountSig = effective.map((p) => p.amount).join('|')
  useEffect(() => {
    setCollected([])
  }, [amountSig])

  const toggleCollected = (i) =>
    setCollected((c) => {
      const next = [...c]
      next[i] = !next[i]
      return next
    })

  const setPayment = (i, patch) =>
    setPayments((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const addSplit = () => {
    if (byItem) {
      setPayments((ps) => [...ps, { method: 'card', amount: '', tip: '' }])
      return
    }
    const amounts = evenSplit(due, payments.length + 1)
    setPayments((ps) => [...ps, { method: 'card', amount: '', tip: '' }].map((p, i) => ({ ...p, amount: amounts[i] })))
  }

  const removePayment = (i) => {
    const next = payments.filter((_, idx) => idx !== i)
    if (byItem) {
      // Drop that payer's items and shift higher payers down a slot.
      setAssignment((a) => {
        const out = {}
        for (const [k, v] of Object.entries(a)) {
          if (v === i) continue
          out[k] = v > i ? v - 1 : v
        }
        return out
      })
      setPayments(next)
      return
    }
    const amounts = evenSplit(due, next.length)
    setPayments(next.map((p, idx) => ({ ...p, amount: amounts[idx] })))
  }

  // Switching to by-item starts with two payers so there is something to split
  // between; switching back restores even amounts.
  const chooseMode = (mode) => {
    setSplitMode(mode)
    setAssignment({})
    if (mode === 'item') {
      if (payments.length < 2) {
        setPayments((ps) => [...ps, { method: 'card', amount: '', tip: '' }])
      }
    } else {
      const amounts = evenSplit(due, payments.length)
      setPayments((ps) => ps.map((p, i) => ({ ...p, amount: amounts[i] })))
    }
  }

  const assignUnit = (key, payer) => setAssignment((a) => ({ ...a, [key]: payer }))
  const assignRest = (payer) =>
    setAssignment((a) => {
      const out = { ...a }
      for (const u of units) if (out[u.key] == null) out[u.key] = payer
      return out
    })

  const applyReward = (memberId, itemId) => {
    setReward(memberId ? { memberId, itemId } : null)
    // Reset payment amounts to the new amount due. The comped item leaves the
    // split entirely, so any existing item assignment is no longer valid.
    const item = itemId ? allItems.find((it) => it.id === itemId) : null
    const comp = item ? round2(Number(item.line_total) || 0) : 0
    setAssignment({})
    setSplitMode('even')
    setPayments([{ method: 'cash', amount: round2(tab.total - comp).toFixed(2), tip: '' }])
  }

  const settle = async () => {
    if (!balanced) return
    setSettling(true)
    const itemOwner = byItem ? itemOwners(units, assignment) : {}

    const { error } = await supabase.rpc('settle_tab', {
      p_table_id: tab.tableId,
      p_order_ids: tab.orders.map((o) => o.id),
      p_payments: effective.map((p, i) => ({
        method: p.method,
        amount: round2(Number(p.amount) || 0),
        tip: round2(Number(p.tip) || 0),
        ...(byItem
          ? {
              item_ids: Object.entries(itemOwner)
                .filter(([, owner]) => owner === i)
                .map(([itemId]) => itemId),
            }
          : {}),
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
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-semibold text-stone-900">
              Pay {tab.label}
            </h3>
            {tab.name && (
              <p className="flex items-center gap-1 text-xs font-medium text-violet-600">
                <ShoppingBag className="h-3.5 w-3.5" /> Takeout
                {tab.counterLabel ? ` · ${tab.counterLabel}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Tab summary */}
          <div className="space-y-3">
            {tab.orders.map((o, i) => (
              <div key={o.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-stone-400">
                    {tab.orders.length > 1 ? `Round ${i + 1} · ` : ''}
                    {formatTime(o.created_at)}
                  </p>
                  <button
                    onClick={() => setEditingOrder(o)}
                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                    title="Remove a returned dish or add an item"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                <div className="space-y-1">
                  {(o.items || []).map((it) => (
                    <div
                      key={it.id}
                      className={`flex justify-between gap-3 text-sm ${it.voided_at ? 'opacity-45' : ''}`}
                    >
                      <span className={`text-stone-700 ${it.voided_at ? 'line-through' : ''}`}>
                        <span className="font-semibold">{it.quantity}×</span> {it.name_snapshot}
                      </span>
                      <span
                        className={`whitespace-nowrap text-stone-500 ${it.voided_at ? 'line-through' : ''}`}
                      >
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
                <Plus className="h-3.5 w-3.5" /> Add payer
              </button>
            </div>

            {/* How to divide the tab */}
            <div className="mb-3 flex gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { key: 'even', label: 'Split evenly' },
                { key: 'item', label: 'Split by item' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => chooseMode(m.key)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    splitMode === m.key
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Assign each item to a payer */}
            {byItem && (
              <div className="mb-3 rounded-xl border border-stone-200">
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2">
                  <span className="text-xs font-semibold text-stone-500">
                    {unassigned > 0
                      ? `${unassigned} item${unassigned === 1 ? '' : 's'} left to assign`
                      : 'All items assigned'}
                  </span>
                  {unassigned > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-stone-400">Rest to</span>
                      {payments.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => assignRest(i)}
                          className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 hover:bg-stone-200"
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto p-2">
                  {units.map((u) => (
                    <div key={u.key} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-700">
                        {u.name}
                      </span>
                      <span className="whitespace-nowrap text-xs tabular-nums text-stone-400">
                        {formatCurrency(u.each, currency)}
                      </span>
                      <div className="flex gap-1">
                        {payments.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => assignUnit(u.key, i)}
                            aria-label={`Assign ${u.name} to payer ${i + 1}`}
                            className={`h-6 w-6 rounded-md text-[11px] font-bold transition ${
                              assignment[u.key] === i
                                ? 'bg-brand text-white'
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2.5">
              {payments.map((p, i) => (
                <div key={i} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {payments.length > 1 && (
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-stone-800 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                    )}
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
                        readOnly={byItem}
                        value={byItem ? itemSplit.amounts[i] : p.amount}
                        onChange={(e) => setPayment(i, { amount: e.target.value })}
                        title={byItem ? 'Set by the items assigned to this payer' : undefined}
                        className={`mt-1 w-full rounded-lg border px-2.5 py-2 text-sm font-semibold outline-none ${
                          byItem
                            ? 'cursor-default border-stone-200 bg-stone-50 text-stone-500'
                            : 'border-stone-300 text-stone-900 focus:border-brand'
                        }`}
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

                  {/* Collect from this payer. Only meaningful once the tab is
                      split — a single payer is settled by the button below. */}
                  {split && (
                    <button
                      onClick={() => toggleCollected(i)}
                      className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                        collected[i]
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      {collected[i] ? (
                        <>
                          <Check className="h-4 w-4" />
                          Collected {formatCurrency(Number(effective[i].amount) || 0, currency)}
                          <span className="text-xs font-medium text-emerald-600">· Undo</span>
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4" />
                          Collect {formatCurrency(Number(effective[i].amount) || 0, currency)}
                          {Number(p.tip) > 0
                            ? ` + ${formatCurrency(Number(p.tip), currency)} tip`
                            : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {split && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-sm">
                <span className="font-medium text-stone-500">
                  {outstanding === 0
                    ? 'All payers collected'
                    : `${outstanding} of ${effective.length} still to pay`}
                </span>
                <span className="font-semibold tabular-nums text-stone-900">
                  {formatCurrency(collectedTotal, currency)} / {formatCurrency(due, currency)}
                </span>
              </div>
            )}

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

            {!balanced &&
              (byItem && unassigned > 0 ? (
                <p className="mt-2 text-xs font-medium text-red-500">
                  Assign the last {unassigned} item{unassigned === 1 ? '' : 's'} to a payer to
                  finish the split.
                </p>
              ) : paidSum !== due ? (
                <p className="mt-2 text-xs font-medium text-red-500">
                  Payments total {formatCurrency(paidSum, currency)} but{' '}
                  {formatCurrency(due, currency)} is due.
                </p>
              ) : null)}
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 safe-bottom">
          <Button className="w-full" size="lg" loading={settling} disabled={!balanced} onClick={settle}>
            <Wallet className="h-4 w-4" />
            {split
              ? outstanding > 0
                ? `Collect from ${outstanding} more payer${outstanding === 1 ? '' : 's'}`
                : `Close tab · ${formatCurrency(due, currency)}`
              : `Pay ${formatCurrency(due, currency)}`}
          </Button>
        </div>
      </div>

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          restaurant={restaurant}
          onClose={() => setEditingOrder(null)}
          onSaved={onEdited}
        />
      )}
    </div>
  )
}
