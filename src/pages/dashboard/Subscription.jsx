import { useState } from 'react'
import { CreditCard, Check, ArrowUpRight, ShieldCheck, Receipt } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { PLANS } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import { Card, Badge, Button } from '../../components/ui'

const STATUS_UI = {
  trialing: { label: 'Free trial', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  past_due: { label: 'Payment due', className: 'bg-amber-100 text-amber-700' },
  unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-700' },
  incomplete: { label: 'Incomplete', className: 'bg-amber-100 text-amber-700' },
  canceled: { label: 'Canceled', className: 'bg-stone-200 text-stone-600' },
}

function planPerks(key) {
  const p = PLANS[key]
  if (key === 'food_truck') return ['Single QR — order by name', 'Online payments', 'Loyalty & rewards']
  const f = [p.maxTables === null ? 'Unlimited tables' : `Up to ${p.maxTables} tables`]
  if (p.loyalty) f.push('Loyalty & rewards')
  if (p.multiBrand) f.push('Multiple brands')
  return f
}

export default function Subscription() {
  const { restaurant, user, refreshRestaurant } = useAuth()
  const toast = useToast()

  const [portalBusy, setPortalBusy] = useState(false)
  const [busyPlan, setBusyPlan] = useState(null)

  const isTruck = restaurant?.business_type === 'food_truck'
  const currentKey = restaurant?.plan || 'trial'
  const current = PLANS[currentKey] || PLANS.trial
  const status = restaurant?.subscription_status
  const statusUi = status ? STATUS_UI[status] : null
  const hasSubscription = !!restaurant?.stripe_subscription_id

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
    if (planKey === currentKey) return
    setBusyPlan(planKey)
    try {
      const resp = await fetch('/api/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, plan: planKey }),
      })
      const data = await resp.json().catch(() => ({}))

      // No subscription yet → start one through Checkout (with the free trial).
      if (data?.needsCheckout) {
        const c = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId: restaurant.id, plan: planKey, email: user?.email }),
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
        toast.success(`Switched to ${PLANS[planKey].label}.`)
      } else {
        throw new Error(data?.error || 'Could not change plan.')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyPlan(null)
    }
  }

  const tiers = isTruck ? ['food_truck'] : ['starter', 'pro', 'premium']

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Subscription</h1>
        <p className="mt-1 text-sm text-stone-500">Manage your plan, payment method, and invoices.</p>
      </div>

      {/* Current plan */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-xl bg-brand/10 p-2 text-brand">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-stone-900">
                  {current.label} plan
                </p>
                <p className="text-sm text-stone-500">
                  ${current.price}
                  <span className="text-stone-400">/mo</span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {statusUi ? (
                <Badge className={statusUi.className}>{statusUi.label}</Badge>
              ) : (
                <Badge className="bg-stone-200 text-stone-600">No subscription</Badge>
              )}
              <span className="text-sm text-stone-500">{dateLine()}</span>
            </div>
          </div>

          <Button variant="outline" onClick={manageBilling} loading={portalBusy} disabled={!hasSubscription}>
            <Receipt className="h-4 w-4" /> Billing &amp; invoices
          </Button>
        </div>

        {!hasSubscription && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
            You don’t have an active subscription yet. Choose a plan below to start your 14-day free
            trial — you can view invoices and manage your card here once it’s set up.
          </div>
        )}
      </Card>

      {/* Change / choose plan */}
      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-stone-900">
          {hasSubscription ? 'Change plan' : 'Choose a plan'}
        </h2>
        <div className={`grid gap-3 ${isTruck ? '' : 'sm:grid-cols-3'}`}>
          {tiers.map((key) => {
            const p = PLANS[key]
            const isCurrent = key === currentKey
            const isUpgrade = p.price > current.price
            return (
              <div
                key={key}
                className={`rounded-2xl border-2 p-4 ${
                  isCurrent ? 'border-brand bg-brand/5' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-stone-900">{p.label}</p>
                  {key === 'pro' && !isCurrent && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1">
                  <span className="text-2xl font-extrabold text-stone-900">${p.price}</span>
                  <span className="text-sm text-stone-400">/mo</span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {planPerks(key).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-sm text-stone-600">
                      <Check className="h-4 w-4 flex-shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <span className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-100 py-2 text-sm font-semibold text-stone-500">
                      <Check className="h-4 w-4" /> Current plan
                    </span>
                  ) : (
                    <Button
                      className="w-full justify-center"
                      variant={isUpgrade ? 'primary' : 'outline'}
                      loading={busyPlan === key}
                      disabled={!!busyPlan}
                      onClick={() => choosePlan(key)}
                    >
                      {hasSubscription ? (isUpgrade ? 'Upgrade' : 'Switch') : 'Choose'}
                      {isUpgrade && <ArrowUpRight className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {hasSubscription && !isTruck && (
          <p className="mt-3 text-xs text-stone-400">
            Upgrades take effect immediately (prorated). Downgrades apply the same way. During a free
            trial you won’t be charged until it ends.
          </p>
        )}
      </div>
    </div>
  )
}
