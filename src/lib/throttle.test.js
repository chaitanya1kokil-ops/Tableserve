import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkAttempt,
  recordFailure,
  clearAttempts,
  describeWait,
  lockoutFor,
  FREE_ATTEMPTS,
} from './throttle'

// jsdom isn't configured for this project, so stand in a minimal localStorage.
beforeEach(() => {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  })
})

const T0 = 1_000_000

describe('checkAttempt', () => {
  it('lets an unseen address straight through', () => {
    expect(checkAttempt('new@example.com', T0)).toEqual({
      blocked: false,
      remainingMs: 0,
      failures: 0,
    })
  })
})

describe('recordFailure', () => {
  it('allows the first few failures without locking', () => {
    for (let i = 1; i < FREE_ATTEMPTS; i++) {
      const r = recordFailure('a@example.com', T0)
      expect(r.blocked).toBe(false)
      expect(r.failures).toBe(i)
    }
  })

  it('locks once the free attempts are used up', () => {
    let r
    for (let i = 0; i < FREE_ATTEMPTS; i++) r = recordFailure('a@example.com', T0)
    expect(r.blocked).toBe(true)
    expect(r.remainingMs).toBe(lockoutFor(1))
  })

  it('lengthens each subsequent lockout', () => {
    const email = 'b@example.com'
    const durations = []
    for (let round = 1; round <= 3; round++) {
      let r
      for (let i = 0; i < FREE_ATTEMPTS; i++) r = recordFailure(email, T0)
      durations.push(r.remainingMs)
    }
    expect(durations[1]).toBeGreaterThan(durations[0])
    expect(durations[2]).toBeGreaterThan(durations[1])
  })

  it('caps the lockout rather than growing without bound', () => {
    expect(lockoutFor(99)).toBe(lockoutFor(4))
  })
})

describe('lock expiry', () => {
  it('reports blocked while the lock is live and clear once it passes', () => {
    const email = 'c@example.com'
    for (let i = 0; i < FREE_ATTEMPTS; i++) recordFailure(email, T0)

    const during = checkAttempt(email, T0 + 1_000)
    expect(during.blocked).toBe(true)
    expect(during.remainingMs).toBeGreaterThan(0)

    const after = checkAttempt(email, T0 + lockoutFor(1) + 1)
    expect(after.blocked).toBe(false)
    expect(after.remainingMs).toBe(0)
  })
})

describe('per-address isolation', () => {
  it('does not lock a colleague out because someone else mistyped', () => {
    for (let i = 0; i < FREE_ATTEMPTS; i++) recordFailure('locked@example.com', T0)
    expect(checkAttempt('locked@example.com', T0).blocked).toBe(true)
    expect(checkAttempt('other@example.com', T0).blocked).toBe(false)
  })

  it('treats an address case- and whitespace-insensitively', () => {
    for (let i = 0; i < FREE_ATTEMPTS; i++) recordFailure('Case@Example.com', T0)
    expect(checkAttempt('  case@example.COM ', T0).blocked).toBe(true)
  })
})

describe('clearAttempts', () => {
  it('wipes the record after a successful login', () => {
    for (let i = 0; i < FREE_ATTEMPTS; i++) recordFailure('d@example.com', T0)
    expect(checkAttempt('d@example.com', T0).blocked).toBe(true)
    clearAttempts('d@example.com')
    expect(checkAttempt('d@example.com', T0).blocked).toBe(false)
  })
})

describe('storage failures', () => {
  it('fails open when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => {},
    })
    // Private browsing must never make the form unusable.
    expect(() => recordFailure('e@example.com', T0)).not.toThrow()
    expect(checkAttempt('e@example.com', T0).blocked).toBe(false)
  })

  it('recovers from corrupt stored JSON', () => {
    localStorage.setItem('tableserve:auth-attempts', '{not json')
    expect(checkAttempt('f@example.com', T0).blocked).toBe(false)
  })
})

describe('describeWait', () => {
  it('reads in seconds under a minute', () => {
    expect(describeWait(30_000)).toBe('30 seconds')
    expect(describeWait(1_000)).toBe('1 second')
  })

  it('rounds up to whole minutes beyond that', () => {
    expect(describeWait(60_000)).toBe('1 minute')
    expect(describeWait(90_000)).toBe('2 minutes')
    expect(describeWait(900_000)).toBe('15 minutes')
  })
})
