import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Check,
  Clock,
  ChefHat,
  Bell,
  Utensils,
  Plus,
  Receipt,
  PartyPopper,
  Store,
} from 'lucide-react'
import { supabase, imageUrl } from '../../lib/supabase'
import { formatCurrency, formatTime } from '../../lib/format'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useToast } from '../../components/Toast'
import { Button, FullPageSpinner, Badge } from '../../components/ui'
import { ORDER_STATUSES } from '../../lib/constants'

const STEPS = [
  { key: 'new', label: 'Received', icon: Check },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Bell },
  { key: 'served', label: 'Served', icon: Utensils },
]

export default function CustomerStatus() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { ready, error: sessionError } = useCustomerSession()

  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [requesting, setRequesting] = useState(false)
  const reloadTimer = useRef(null)
  const linkedOrderIds = useRef(new Set())

  // When a loyalty-linked order disappears from the open list, the bill was
  // just paid — check whether the visit counted and celebrate in the moment.
  const checkLoyaltyCelebration = useCallback(async () => {
    try {
      const raw = localStorage.getItem(`tableserve:loyalty:${restaurantId}`)
      if (!raw) return
      const stored = JSON.parse(raw)
      if (!stored?.id) return
      const { data } = await supabase.rpc('loyalty_status', { p_member: stored.id })
      if (!data) return
      if ((data.visits || 0) > (stored.visits || 0)) {
        const ev = data.reward_every || 10
        if ((data.rewards_available || 0) > (stored.rewards_available || 0)) {
          toast.success(`🎉 Visit #${data.visits} — you've earned ${data.reward || 'a free item'}!`)
        } else {
          toast.success(
            `⭐ Visit #${data.visits} counted — ${ev - (data.visits % ev)} more to ${data.reward || 'your reward'}.`,
          )
        }
      }
      localStorage.setItem(`tableserve:loyalty:${restaurantId}`, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }, [restaurantId, toast])

  const load = useCallback(async () => {
    // Restaurant: orders for this table, reset once the bill is paid at checkout.
    // Food truck (no table): the guest's own orders (RLS-scoped), tracked from
    // 'awaiting payment' right through until they're collected.
    let q = supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '(completed,cancelled)')
    q = tableId
      ? q.eq('table_id', tableId).is('paid_at', null)
      : q.is('table_id', null)
    const [{ data: rest }, { data: ords }] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
      q.order('created_at', { ascending: false }),
    ])
    setRestaurant(rest || null)
    setOrders(ords || [])
    setLoading(false)

    // Detect "my linked order just got paid" transitions.
    const current = new Set((ords || []).filter((o) => o.loyalty_member_id).map((o) => o.id))
    const paidAway = [...linkedOrderIds.current].some((id) => !current.has(id))
    linkedOrderIds.current = current
    if (paidAway) checkLoyaltyCelebration()
  }, [restaurantId, tableId, checkLoyaltyCelebration])

  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(load, 200)
  }, [load])

  useEffect(() => {
    if (!ready) return
    load()
    // Scope by restaurant (works with or without a table); RLS limits the
    // rows to the guest's own orders either way.
    const channel = supabase
      .channel(`my-orders-${restaurantId}-${tableId || 'truck'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        scheduleReload,
      )
      .subscribe()
    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(channel)
    }
  }, [ready, restaurantId, tableId, load, scheduleReload])

  const accent = restaurant?.accent_color || '#b45309'
  const currency = restaurant?.currency || 'USD'
  const isTruck = !tableId // truck status route carries no table
  const menuPath = tableId ? `/r/${restaurantId}/t/${tableId}` : `/r/${restaurantId}`

  const requestBill = async () => {
    setRequesting(true)
    const { error } = await supabase.rpc('request_bill', { p_table_id: tableId })
    setRequesting(false)
    if (error) return toast.error(error.message)
    toast.success('Bill requested — a server will be with you.')
    load()
  }

  if (sessionError) return <FullPageSpinner label="Connecting…" />
  if (!ready || loading) return <FullPageSpinner label="Loading your order…" />

  const sessionOrders = orders.filter((o) => o.status !== 'cancelled')
  const sessionTotal = sessionOrders.reduce((s, o) => s + Number(o.total || 0), 0)
  const sessionTax = sessionOrders.reduce((s, o) => s + Number(o.tax || 0), 0)
  const openOrders = sessionOrders.filter((o) => o.status !== 'completed')
  const hasOpen = openOrders.length > 0
  // Only "fully requested" when EVERY open order is already flagged — so placing
  // a new order re-enables the button to request the bill for it too.
  const allBilled = hasOpen && openOrders.every((o) => o.bill_requested)

  return (
    <div className="min-h-[100dvh] bg-[#faf6ef] pb-28" style={{ '--brand': accent }}>
      <header className="relative overflow-hidden bg-stone-900 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 85% -10%, ${accent}59, transparent 60%), radial-gradient(90% 70% at -10% 115%, ${accent}33, transparent 65%)`,
          }}
        />
        <div className="relative mx-auto max-w-2xl px-4 pb-6 pt-6">
          <div className="flex items-center gap-3">
            {restaurant?.logo_url ? (
              <img src={imageUrl(restaurant.logo_url)} alt="" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/25" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Store className="h-6 w-6" />
              </span>
            )}
            <div>
              <h1 className="font-display text-xl font-semibold">{restaurant?.name}</h1>
              <p className="text-sm text-amber-200/80">Your order</p>
            </div>
          </div>
        </div>
        <div
          className="relative h-px w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 inline-flex rounded-2xl bg-gray-100 p-3 text-gray-400">
              <Receipt className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">No orders yet</h2>
            <p className="mt-1 text-sm text-gray-500">Browse the menu and place your first order.</p>
            <Button
              className="mt-4"
              style={{ backgroundColor: accent }}
              onClick={() => navigate(menuPath)}
            >
              View menu
            </Button>
          </div>
        ) : (
          <CombinedOrderCard orders={orders} accent={accent} currency={currency} />
        )}
      </div>

      {/* Bottom action bar */}
      {orders.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur safe-bottom">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {isTruck ? 'Order total' : 'Table total'}
                {sessionTax > 0 && (
                  <span className="block text-xs text-gray-400">
                    incl. {formatCurrency(sessionTax, currency)} tax
                  </span>
                )}
              </span>
              <span className="text-lg font-extrabold text-gray-900">
                {formatCurrency(sessionTotal, currency)}
              </span>
            </div>
            {isTruck ? (
              /* Food trucks pay online per order — no shared tab or bill request. */
              <Button variant="outline" className="w-full" onClick={() => navigate(menuPath)}>
                <Plus className="h-4 w-4" /> Order more
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(menuPath)}>
                  <Plus className="h-4 w-4" /> Add items
                </Button>
                <Button
                  className="flex-1"
                  style={{ backgroundColor: accent }}
                  loading={requesting}
                  disabled={!hasOpen || allBilled}
                  onClick={requestBill}
                >
                  <Receipt className="h-4 w-4" />
                  {allBilled ? 'Bill requested' : 'Request bill'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// All of a table's orders merged into one card. Each place_order call is a
// "round" of items; the kitchen still sees rounds as separate order tickets.
function CombinedOrderCard({ orders, accent, currency }) {
  // Oldest first, so items read in the sequence they were added.
  const rounds = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const active = rounds.filter((o) => o.status !== 'cancelled')
  // Track the newest round that is still in progress.
  const current = [...active].reverse().find((o) => o.status !== 'completed')
  const allDone = active.length > 0 && !current
  const currentIndex = current ? STEPS.findIndex((s) => s.key === current.status) : STEPS.length - 1

  const subtotal = active.reduce((s, o) => s + Number(o.subtotal ?? o.total ?? 0), 0)
  const tax = active.reduce((s, o) => s + Number(o.tax || 0), 0)
  const total = active.reduce((s, o) => s + Number(o.total || 0), 0)
  const billRequested = active.some((o) => o.bill_requested)
  const allPaid = active.length > 0 && active.every((o) => o.paid_at)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Your order</h2>
        {allPaid ? (
          <Badge className="bg-emerald-100 text-emerald-700">
            <Check className="h-3 w-3" /> Paid
          </Badge>
        ) : (
          billRequested && (
            <Badge className="bg-orange-100 text-orange-700">
              <Receipt className="h-3 w-3" /> Bill requested
            </Badge>
          )
        )}
      </div>

      {allDone ? (
        <div className="my-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
          <PartyPopper className="h-5 w-5" />
          <span className="font-semibold">Enjoy! Everything has been served.</span>
        </div>
      ) : (
        <>
          {active.length > 1 && (
            <p className="mt-0.5 text-xs text-gray-400">Tracking your latest items</p>
          )}
          <Stepper steps={STEPS} currentIndex={currentIndex} accent={accent} />
        </>
      )}

      <div className="mt-1 space-y-3">
        {rounds.map((o, i) => {
          const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.new
          const cancelled = o.status === 'cancelled'
          return (
            <div key={o.id} className="border-t border-gray-100 pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  {rounds.length > 1 && <>Round {i + 1} · </>}
                  {formatTime(o.created_at)}
                  {o.order_type === 'takeout' && (
                    <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                      Takeout
                    </span>
                  )}
                </span>
                <Badge className={st.color}>{st.label}</Badge>
              </div>
              <div className={`space-y-1.5 ${cancelled ? 'opacity-50' : ''}`}>
                {(o.items || []).map((it) => (
                  <div key={it.id} className="flex justify-between gap-3 text-sm">
                    <span className={`text-gray-700 ${cancelled ? 'line-through' : ''}`}>
                      <span className="font-semibold">{it.quantity}×</span> {it.name_snapshot}
                      {Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
                        <span className="text-gray-400">
                          {' '}
                          ({it.selected_options.map((op) => op.value).join(', ')})
                        </span>
                      )}
                    </span>
                    <span className={`whitespace-nowrap text-gray-500 ${cancelled ? 'line-through' : ''}`}>
                      {formatCurrency(it.line_total, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
        {tax > 0 && (
          <>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span>
              <span>{formatCurrency(tax, currency)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-500">Order total</span>
          <span className="font-bold text-gray-900">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  )
}

function Stepper({ steps, currentIndex, accent }) {
  return (
    <div className="my-4 flex items-center">
      {steps.map((step, i) => {
        const done = i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`grid h-10 w-10 place-items-center rounded-full transition ${
                  done ? 'text-white' : 'bg-gray-100 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-offset-1' : ''}`}
                style={{
                  backgroundColor: done ? accent : undefined,
                  '--tw-ring-color': isCurrent ? `${accent}40` : undefined,
                }}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`mt-1 text-[11px] font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-1 h-0.5 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: i < currentIndex ? '100%' : '0%', backgroundColor: accent }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
