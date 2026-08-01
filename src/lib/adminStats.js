// Platform-wide analytics for the admin console. Pure — no React, no Supabase —
// so the numbers the whole business is read off can be tested directly.

import { PLANS } from './constants'

export const DAY_MS = 24 * 60 * 60 * 1000

const pctChange = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * @param restaurants rows from public.restaurants (with `plan`, `status`,
 *   `created_at`, `trial_ends_at`)
 * @param orders rows from public.orders (`restaurant_id`, `total`, `status`,
 *   `created_at`)
 */
export function computeAnalytics(restaurants = [], orders = [], now = new Date()) {
  const valid = orders.filter((o) => o.status !== 'cancelled')
  const nowMs = now.getTime()

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
  let gmvPrev30 = 0
  let ordersPrev30 = 0
  let gmv14 = 0
  let lifetimeGmv = 0
  const t7 = nowMs - 7 * DAY_MS
  const t14 = nowMs - 14 * DAY_MS
  const t30 = nowMs - 30 * DAY_MS
  const t60 = nowMs - 60 * DAY_MS

  for (const o of valid) {
    const t = new Date(o.created_at).getTime()
    const total = Number(o.total || 0)
    lifetimeGmv += total

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
    } else if (t >= t60) {
      gmvPrev30 += total
      ordersPrev30 += 1
    }
    if (t >= t7) rest.orders7 += 1
    else if (t >= t14) rest.ordersPrev7 += 1

    const bucket = new Date(new Date(o.created_at).setHours(0, 0, 0, 0)).toISOString().slice(0, 10)
    const idx = dayIdx[bucket]
    if (idx !== undefined) {
      days[idx].total += total
      days[idx].count += 1
      gmv14 += total
    }
  }

  // ---- client-side rollups -------------------------------------------------
  const planMix = {}
  const revenueByPlan = {}
  let mrr = 0
  let payingCount = 0
  let mrrAtRisk = 0
  let trialExpiring = 0
  let trialsExpired = 0
  let trialCount = 0
  let newThisMonth = 0
  let newLastMonth = 0
  let activeCount = 0
  let pendingCount = 0
  let suspendedCount = 0

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Signups per month, last 6 months, oldest first.
  const signups = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    signups.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      count: 0,
    })
  }
  const signupIdx = Object.fromEntries(signups.map((s, i) => [s.key, i]))

  for (const r of restaurants) {
    const plan = r.plan || 'trial'
    const price = PLANS[plan]?.price || 0
    planMix[plan] = (planMix[plan] || 0) + 1

    if (r.status === 'active') activeCount += 1
    if (r.status === 'pending') pendingCount += 1
    if (r.status === 'suspended') suspendedCount += 1

    if (r.status === 'active' && price > 0) {
      mrr += price
      payingCount += 1
      revenueByPlan[plan] = (revenueByPlan[plan] || 0) + price
    }
    // Revenue that has stopped because the account is suspended, not cancelled.
    if (r.status === 'suspended' && price > 0) mrrAtRisk += price

    if (plan === 'trial') {
      trialCount += 1
      if (r.trial_ends_at) {
        const ends = new Date(r.trial_ends_at).getTime()
        if (ends < nowMs) trialsExpired += 1
        else if (ends < nowMs + 7 * DAY_MS) trialExpiring += 1
      }
    }

    const created = new Date(r.created_at)
    if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) {
      newThisMonth += 1
    }
    if (created.getMonth() === lastMonth.getMonth() && created.getFullYear() === lastMonth.getFullYear()) {
      newLastMonth += 1
    }
    const sKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
    if (signupIdx[sKey] !== undefined) signups[signupIdx[sKey]].count += 1
  }

  // Clients that are live and were ordering, but have gone silent for 14 days.
  let dormant = 0
  let neverOrdered = 0
  for (const r of restaurants) {
    const usage = perRest[r.id]
    if (!usage || !usage.lastOrderAt) {
      neverOrdered += 1
      continue
    }
    if (r.status === 'active' && new Date(usage.lastOrderAt).getTime() < t14) dormant += 1
  }

  // Biggest clients by 30-day order volume.
  const topClients = restaurants
    .map((r) => ({
      id: r.id,
      name: r.name,
      plan: r.plan || 'trial',
      revenue30: perRest[r.id]?.revenue30 || 0,
      orders30: perRest[r.id]?.orders || 0,
    }))
    .filter((r) => r.revenue30 > 0)
    .sort((a, b) => b.revenue30 - a.revenue30)
    .slice(0, 5)

  return {
    days,
    maxDay: Math.max(...days.map((d) => d.total), 1),
    perRest,
    signups,
    maxSignup: Math.max(...signups.map((s) => s.count), 1),
    topClients,

    // money
    gmv30,
    gmvPrev30,
    gmv14,
    gmvGrowth: pctChange(gmv30, gmvPrev30),
    lifetimeGmv,
    orders30,
    ordersPrev30,
    ordersGrowth: pctChange(orders30, ordersPrev30),
    lifetimeOrders: valid.length,
    aov: orders30 > 0 ? gmv30 / orders30 : 0,

    // subscription
    mrr,
    arpu: payingCount > 0 ? mrr / payingCount : 0,
    payingCount,
    mrrAtRisk,
    planMix,
    revenueByPlan,
    trialCount,
    trialExpiring,
    trialsExpired,
    // Share of non-trial-eligible clients actually paying.
    conversionRate: payingCount + trialCount > 0 ? (payingCount / (payingCount + trialCount)) * 100 : 0,

    // roster health
    total: restaurants.length,
    activeCount,
    pendingCount,
    suspendedCount,
    dormant,
    neverOrdered,
    newThisMonth,
    newLastMonth,
    signupGrowth: pctChange(newThisMonth, newLastMonth),
  }
}

// Clients as CSV, for a spreadsheet or a board update.
export function clientsToCsv(restaurants, perRest) {
  const head = [
    'Name', 'Status', 'Plan', 'Owner email', 'Created',
    'Orders (all time)', 'Revenue (all time)', 'Revenue (30d)', 'Last order',
  ]
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = restaurants.map((r) => {
    const u = perRest[r.id] || {}
    return [
      r.name,
      r.status,
      PLANS[r.plan || 'trial']?.label || r.plan,
      r.owner?.email || '',
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
      u.orders || 0,
      (u.revenue || 0).toFixed(2),
      (u.revenue30 || 0).toFixed(2),
      u.lastOrderAt ? new Date(u.lastOrderAt).toISOString().slice(0, 10) : '',
    ].map(esc).join(',')
  })
  return [head.join(','), ...rows].join('\n')
}
