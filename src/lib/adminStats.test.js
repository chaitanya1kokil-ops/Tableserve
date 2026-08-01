import { describe, it, expect } from 'vitest'
import { computeAnalytics, clientsToCsv, DAY_MS } from './adminStats'

// Fixed clock so "last 30 days" means the same thing on every run.
const NOW = new Date('2026-06-15T12:00:00.000Z')
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS).toISOString()

const restaurants = [
  { id: 'r1', name: 'Alpha',  status: 'active',    plan: 'pro',     created_at: daysAgo(200) },
  { id: 'r2', name: 'Beta',   status: 'active',    plan: 'starter', created_at: daysAgo(5) },
  { id: 'r3', name: 'Gamma',  status: 'suspended', plan: 'pro',     created_at: daysAgo(120) },
  { id: 'r4', name: 'Delta',  status: 'active',    plan: 'trial',   created_at: daysAgo(3), trial_ends_at: daysAgo(-4) },
  { id: 'r5', name: 'Eps',    status: 'pending',   plan: 'trial',   created_at: daysAgo(40), trial_ends_at: daysAgo(2) },
]

const orders = [
  { restaurant_id: 'r1', total: 100, status: 'completed', created_at: daysAgo(1) },
  { restaurant_id: 'r1', total: 50,  status: 'served',    created_at: daysAgo(10) },
  { restaurant_id: 'r2', total: 25,  status: 'completed', created_at: daysAgo(2) },
  { restaurant_id: 'r1', total: 999, status: 'cancelled', created_at: daysAgo(1) }, // excluded
  { restaurant_id: 'r3', total: 200, status: 'completed', created_at: daysAgo(45) }, // prior window
  { restaurant_id: 'r1', total: 300, status: 'completed', created_at: daysAgo(400) }, // lifetime only
]

const a = computeAnalytics(restaurants, orders, NOW)

describe('computeAnalytics — order volume', () => {
  it('ignores cancelled orders everywhere', () => {
    expect(a.gmv30).toBe(175) // 100 + 50 + 25, not the 999 cancelled
    expect(a.lifetimeOrders).toBe(5)
  })

  it('separates the last 30 days from the 30 before it', () => {
    expect(a.gmv30).toBe(175)
    expect(a.gmvPrev30).toBe(200) // the 45-day-old order
    expect(a.orders30).toBe(3)
    expect(a.ordersPrev30).toBe(1)
  })

  it('reports growth as a percentage against the prior window', () => {
    expect(a.gmvGrowth).toBeCloseTo(((175 - 200) / 200) * 100, 6)
    expect(a.ordersGrowth).toBeCloseTo(((3 - 1) / 1) * 100, 6)
  })

  it('counts lifetime volume beyond both windows', () => {
    expect(a.lifetimeGmv).toBe(675) // 100+50+25+200+300
  })

  it('computes average order value over the last 30 days', () => {
    expect(a.aov).toBeCloseTo(175 / 3, 6)
  })

  it('reports zero AOV rather than NaN when nothing sold', () => {
    const empty = computeAnalytics(restaurants, [], NOW)
    expect(empty.aov).toBe(0)
    expect(empty.gmv30).toBe(0)
  })
})

describe('computeAnalytics — subscription', () => {
  it('bills MRR only for active paying clients', () => {
    // Alpha pro 179 + Beta starter 99. Gamma is suspended, Delta/Eps are trials.
    expect(a.mrr).toBe(179 + 99)
    expect(a.payingCount).toBe(2)
  })

  it('counts a suspended paid plan as revenue at risk, not as MRR', () => {
    expect(a.mrrAtRisk).toBe(179) // Gamma, pro
    // Two pro clients exist but only the active one bills.
    expect(a.planMix.pro).toBe(2)
    expect(a.revenueByPlan.pro).toBe(179)
  })

  it('averages revenue per paying client', () => {
    expect(a.arpu).toBeCloseTo((179 + 99) / 2, 6)
  })

  it('splits recurring revenue by plan', () => {
    expect(a.revenueByPlan).toEqual({ pro: 179, starter: 99 })
  })

  it('separates expiring trials from already-expired ones', () => {
    expect(a.trialExpiring).toBe(1) // Delta ends in 4 days
    expect(a.trialsExpired).toBe(1) // Eps ended 2 days ago
  })

  it('expresses conversion as paying over paying-plus-trials', () => {
    expect(a.conversionRate).toBeCloseTo((2 / (2 + 2)) * 100, 6)
  })

  it('returns zero conversion rather than NaN with no clients', () => {
    expect(computeAnalytics([], [], NOW).conversionRate).toBe(0)
    expect(computeAnalytics([], [], NOW).arpu).toBe(0)
  })
})

describe('computeAnalytics — roster health', () => {
  it('counts each status', () => {
    expect(a.activeCount).toBe(3)
    expect(a.pendingCount).toBe(1)
    expect(a.suspendedCount).toBe(1)
    expect(a.total).toBe(5)
  })

  it('flags clients that have never ordered', () => {
    expect(a.neverOrdered).toBe(2) // Delta and Eps
  })

  it('flags an active client that has gone quiet for 14 days', () => {
    const quiet = computeAnalytics(
      [{ id: 'q', name: 'Quiet', status: 'active', plan: 'pro', created_at: daysAgo(90) }],
      [{ restaurant_id: 'q', total: 10, status: 'completed', created_at: daysAgo(20) }],
      NOW,
    )
    expect(quiet.dormant).toBe(1)
  })

  it('does not call a recently-ordering client dormant', () => {
    const busy = computeAnalytics(
      [{ id: 'b', name: 'Busy', status: 'active', plan: 'pro', created_at: daysAgo(90) }],
      [{ restaurant_id: 'b', total: 10, status: 'completed', created_at: daysAgo(2) }],
      NOW,
    )
    expect(busy.dormant).toBe(0)
  })

  it('does not count a suspended client as dormant — it is already off', () => {
    const susp = computeAnalytics(
      [{ id: 's', name: 'Susp', status: 'suspended', plan: 'pro', created_at: daysAgo(90) }],
      [{ restaurant_id: 's', total: 10, status: 'completed', created_at: daysAgo(60) }],
      NOW,
    )
    expect(susp.dormant).toBe(0)
  })
})

describe('computeAnalytics — series', () => {
  it('builds 14 daily buckets ending today', () => {
    expect(a.days).toHaveLength(14)
    expect(a.days[13].key).toBe(NOW.toISOString().slice(0, 10))
  })

  it('lands each order in its own day bucket', () => {
    const yesterday = a.days.find((d) => d.key === daysAgo(1).slice(0, 10))
    expect(yesterday.total).toBe(100)
    expect(yesterday.count).toBe(1)
  })

  it('keeps maxDay at least 1 so bar heights never divide by zero', () => {
    expect(computeAnalytics([], [], NOW).maxDay).toBe(1)
  })

  it('builds 6 monthly signup buckets', () => {
    expect(a.signups).toHaveLength(6)
    expect(a.signups[5].count).toBe(2) // Beta and Delta, this month
  })

  it('ranks the top clients by 30-day volume and excludes silent ones', () => {
    expect(a.topClients.map((c) => c.name)).toEqual(['Alpha', 'Beta'])
    expect(a.topClients[0].revenue30).toBe(150)
  })
})

describe('clientsToCsv', () => {
  it('emits a header plus one row per client', () => {
    const csv = clientsToCsv(restaurants, a.perRest)
    const lines = csv.split('\n')
    expect(lines[0]).toMatch(/^Name,Status,Plan/)
    expect(lines).toHaveLength(restaurants.length + 1)
  })

  it('quotes fields containing commas or quotes so columns do not shift', () => {
    const csv = clientsToCsv(
      [{ id: 'x', name: 'Smith, Sons & "Co"', status: 'active', plan: 'pro', created_at: daysAgo(1) }],
      {},
    )
    expect(csv.split('\n')[1]).toContain('"Smith, Sons & ""Co"""')
  })

  it('writes zeros rather than blanks for a client with no orders', () => {
    const csv = clientsToCsv([restaurants[3]], a.perRest)
    expect(csv.split('\n')[1]).toContain(',0,0.00,0.00,')
  })
})
