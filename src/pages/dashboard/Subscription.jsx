import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Check, ArrowUpRight, Receipt, Download, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { PLANS } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/format'
import { Badge, Button } from '../../components/ui'

const STATUS_UI = {
  trialing: { label: 'Free trial', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  past_due: { label: 'Payment due', className: 'bg-amber-100 text-amber-700' },
  unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-700' },
  incomplete: { label: 'Incomplete', className: 'bg-amber-100 text-amber-700' },
  canceled: { label: 'Canceled', className: 'bg-stone-200 text-stone-600' },
}

const INVOICE_STATUS = {
  paid: 'bg-emerald-100 text-emerald-700',
  open: 'bg-amber-100 text-amber-700',
  draft: 'bg-stone-100 text-stone-500',
  void: 'bg-stone-100 text-stone-500',
  uncollectible: 'bg-red-100 text-red-700',
}

function planPerks(key) {
  const p = PLANS[key]
  if (key === 'food_truck') return ['Single QR — order by name', 'Online payments', 'Loyalty & rewards']
  const f = [p.maxTables === null ? 'Unlimited tables' : `Up to ${p.maxTables} tables`]
  if (p.loyalty) f.push('Loyalty & rewards')
  if (p.multiBrand) f.push('Multiple brands')
  return f
}

// Yearly = 10× monthly (2 months free). Helpers keep the display consistent.
const yearlyTotal = (monthly) => monthly * 10
const yearlySavings = (monthly) => monthly * 2

export default function Subscription() {
  const { restaurant, user, refreshRestaurant } = useAuth()
  const toast = useToast()
  const accent = restaurant?.accent_color || '#b45309'

  const isTruck = restaurant?.business_type === 'food_truck'
  const currentKey = restaurant?.plan || 'trial'
  const current = PLANS[currentKey] || PLANS.trial
  const status = restaurant?.subscription_status
  const statusUi = status ? STATUS_UI[status] : null
  const hasSubscription = !!restaurant?.stripe_subscription_id
  const currentInterval = restaurant?.billing_interval === 'year' ? 'year' : 'month'

  const [interval, setInterval] = useState(currentInterval)
  const [portalBusy, setPortalBusy] = useState(false)
  const [busyKey, setBusyKey] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [invLoading, setInvLoading] = useState(false)

  const loadInvoices = useCallback(async () => {
    if (!restaurant?.stripe_customer_id) return
    setInvLoading(true)
    try {
      const resp = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      })
      const data = await resp.json().catch(() => ({}))
      setInvoices(data?.invoices || [])
    } finally {
      setInvLoading(false)
    }
  }, [restaurant?.id, restaurant?.stripe_customer_id])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const heroPrice = currentInterval === 'year' ? yearlyTotal(current.price) : current.price
  const heroUnit = currentInterval === 'year' ? 'yr' : 'mo'

  const dateLine = () => {
    if (status === 'trialing' && restaurant?.trial_ends_at)
      return `Free trial ends ${formatDate(restaurant.trial_ends_at)}`
    if (status === 'active' && restaurant?.current_period_end)
      return `Renews ${formatDate(restaurant.current_period_end)}`
    if (status === 'past_due') return 'Payment is past due — please update your card.'
    if (status === 'canceled') return 'Your subscription has been canceled.'
    if (!status) return 'No active subscription yet.'
    return null
  }

  async function manageBilling() {
    setPortalBusy(true)
    try {
      const resp = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      })
      const data = await resp.json().catch(() => ({}))
      if (data?.url) {
        window.location.href = data.url
        return
      }
      throw new Error(data?.error || 'Could not open the billing portal.')
    } catch (e) {
      toast.error(e.message)
      setPortalBusy(false)
    }
  }

  async function choosePlan(planKey) {
    const key = `${planKey}_${interval}`
    setBusyKey(key)
    try {
      const resp = await fetch('/api/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, plan: planKey, interval }),
      })
      const data = await resp.json().catch(() => ({}))

      if (data?.needsCheckout) {
        const c = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId: restaurant.id, plan: planKey, interval, email: user?.email }),
        })
        const cd = await c.json().catch(() => ({}))
        if (cd?.url) {
          window.location.href = cd.url
          return
        }
        throw new Error(cd?.error || 'Could not start checkout.')
      }

      if (data?.ok) {
        await refreshRestaurant()
        loadInvoices()
        toast.success(`Updated to ${PLANS[planKey].label}, billed ${interval === 'year' ? 'yearly' : 'monthly'}.`)
      } else {
        throw new Error(data?.error || 'Could not change plan.')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyKey(null)
    }
  }

  const tiers = isTruck ? ['food_truck'] : ['starter', 'pro', 'premium']

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Subscription</h1>
        <p className="mt-1 text-sm text-stone-500">Manage your plan, payment method, and invoices.</p>
      </div>

      {/* Current plan hero */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 p-6 text-white shadow-sm">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(130% 120% at 100% 0%, ${accent}66, transparent 60%)` }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex rounded-xl bg-white/10 p-2 ring-1 ring-white/15">
              <CreditCard className="h-5 w-5" />
            </div>
            <p className="text-xs uppercase tracking-wide text-white/50">Current plan</p>
            <div className="mt-0.5 flex items-end gap-2">
              <p className="font-display text-3xl font-semibold">{current.label}</p>
              {statusUi ? (
                <Badge className={statusUi.className}>{statusUi.label}</Badge>
              ) : (
                <Badge className="bg-white/15 text-white">No subscription</Badge>
              )}
            </div>
            <p className="mt-1 text-white/70">
              <span className="text-lg font-semibold text-white">${heroPrice.toLocaleString()}</span>{' '}
              CAD/{heroUnit}
            </p>
            <p className="mt-2 text-sm text-white/60">{dateLine()}</p>
          </div>

          <button
            onClick={manageBilling}
            disabled={!hasSubscription || portalBusy}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {portalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Billing &amp; invoices
          </button>
        </div>

        {!hasSubscription && (
          <p className="relative mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
            You don’t have an active subscription yet. Choose a plan below to start your 14-day free
            trial — no charge today.
          </p>
        )}
      </div>

      {/* Change / choose plan */}
      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold text-stone-900">
            {hasSubscription ? 'Change plan' : 'Choose a plan'}
          </h2>
          {/* Monthly / Yearly toggle */}
          <div className="inline-flex items-center gap-1 self-start rounded-full bg-stone-100 p-1">
            <button
              onClick={() => setInterval('month')}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                interval === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                interval === 'year' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              Yearly
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                2 MONTHS FREE
              </span>
            </button>
          </div>
        </div>

        <div className={`grid gap-3 ${isTruck ? '' : 'sm:grid-cols-3'}`}>
          {tiers.map((key) => {
            const p = PLANS[key]
            const isCurrent = key === currentKey && interval === currentInterval
            const isUpgrade = p.price > current.price
            const sameTierSwitch = key === currentKey && interval !== currentInterval
            const price = interval === 'year' ? yearlyTotal(p.price) : p.price
            const unit = interval === 'year' ? 'yr' : 'mo'
            const featured = key === 'pro'
            const busy = busyKey === `${key}_${interval}`
            const label = !hasSubscription
              ? 'Choose'
              : sameTierSwitch
                ? interval === 'year'
                  ? 'Switch to yearly'
                  : 'Switch to monthly'
                : isUpgrade
                  ? 'Upgrade'
                  : 'Switch'
            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl border-2 p-5 transition ${
                  isCurrent ? 'border-brand bg-brand/5' : featured ? 'border-brand/30' : 'border-stone-200'
                }`}
              >
                {featured && !isCurrent && (
                  <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    <Sparkles className="h-3 w-3" /> Popular
                  </span>
                )}
                <p className="font-display text-lg font-bold text-stone-900">{p.label}</p>
                <div className="mt-1">
                  <span className="text-3xl font-extrabold text-stone-900">${price.toLocaleString()}</span>
                  <span className="text-sm text-stone-400"> CAD/{unit}</span>
                </div>
                {interval === 'year' ? (
                  <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                    Save ${yearlySavings(p.price).toLocaleString()} a year
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-stone-400">or ${yearlyTotal(p.price).toLocaleString()}/yr — 2 months free</p>
                )}

                <ul className="mt-4 flex-1 space-y-1.5">
                  {planPerks(key).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-sm text-stone-600">
                      <Check className="h-4 w-4 flex-shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {isCurrent ? (
                    <span className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-100 py-2.5 text-sm font-semibold text-stone-500">
                      <Check className="h-4 w-4" /> Current plan
                    </span>
                  ) : (
                    <Button
                      className="w-full justify-center"
                      variant={isUpgrade || featured ? 'primary' : 'outline'}
                      loading={busy}
                      disabled={!!busyKey}
                      onClick={() => choosePlan(key)}
                    >
                      {label}
                      {isUpgrade && <ArrowUpRight className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {hasSubscription && (
          <p className="mt-3 text-xs text-stone-400">
            Plan changes take effect immediately (prorated). While on a free trial you won’t be
            charged until it ends.
          </p>
        )}
      </div>

      {/* Payment history */}
      <div className="mt-8">
        <h2 className="mb-3 font-display text-xl font-semibold text-stone-900">Payment history</h2>
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          {invLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
            </div>
          ) : invoices.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Receipt className="mx-auto h-8 w-8 text-stone-300" />
              <p className="mt-2 text-sm font-medium text-stone-500">No payments yet</p>
              <p className="text-xs text-stone-400">
                Invoices appear here after your first charge (once the free trial ends).
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800">
                      {formatCurrency(inv.amount / 100, (inv.currency || 'cad').toUpperCase())}
                    </p>
                    <p className="text-xs text-stone-400">
                      {formatDate(new Date(inv.created * 1000).toISOString())}
                      {inv.number ? ` · ${inv.number}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={INVOICE_STATUS[inv.status] || 'bg-stone-100 text-stone-500'}>
                      {inv.status}
                    </Badge>
                    {(inv.pdf || inv.url) && (
                      <a
                        href={inv.pdf || inv.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Receipt</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
