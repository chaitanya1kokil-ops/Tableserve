// Client-side attempt throttling for the auth forms.
//
// SCOPE, HONESTLY: this runs in the browser, so it is a speed bump, not a
// security control. Anyone can call the Supabase auth endpoint directly and
// never see it. Real brute-force protection is server-side — Supabase's own
// per-IP auth rate limits, and a CAPTCHA on the auth endpoints.
//
// What it IS good for: stopping a real person (or a stuck retry loop) hammering
// the form after a typo'd password, cutting pointless load, and telling the user
// plainly what's happening instead of flashing the same red toast ten times.
//
// Attempts are tracked per email so one person fat-fingering their own password
// never locks out a colleague on the same machine.

const KEY = 'tableserve:auth-attempts'

// Failures before the first lockout, then how long each further lockout lasts.
export const FREE_ATTEMPTS = 5
const STEPS_MS = [30_000, 60_000, 300_000, 900_000] // 30s, 1m, 5m, 15m

const now = () => Date.now()

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {} // private mode, disabled storage, corrupt JSON — fail open
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — throttling simply doesn't persist */
  }
}

const normalize = (email) => String(email || '').trim().toLowerCase()

/** Lock duration for the nth lockout (1-based), capped at the last step. */
export function lockoutFor(strikes) {
  const i = Math.min(strikes - 1, STEPS_MS.length - 1)
  return STEPS_MS[Math.max(0, i)]
}

/**
 * @returns {{ blocked: boolean, remainingMs: number, failures: number }}
 */
export function checkAttempt(email, at = now()) {
  const rec = readAll()[normalize(email)]
  if (!rec) return { blocked: false, remainingMs: 0, failures: 0 }
  const remaining = (rec.until || 0) - at
  return {
    blocked: remaining > 0,
    remainingMs: Math.max(0, remaining),
    failures: rec.failures || 0,
  }
}

/** Record a failed attempt; returns the same shape as checkAttempt. */
export function recordFailure(email, at = now()) {
  const key = normalize(email)
  const all = readAll()
  const rec = all[key] || { failures: 0, strikes: 0, until: 0 }

  rec.failures += 1
  if (rec.failures >= FREE_ATTEMPTS) {
    rec.strikes += 1
    rec.until = at + lockoutFor(rec.strikes)
    rec.failures = 0 // next lockout is longer, not immediate
  }
  all[key] = rec
  writeAll(all)

  const remaining = Math.max(0, (rec.until || 0) - at)
  return { blocked: remaining > 0, remainingMs: remaining, failures: rec.failures }
}

/** Clear on success, so a good login wipes the slate. */
export function clearAttempts(email) {
  const all = readAll()
  delete all[normalize(email)]
  writeAll(all)
}

/** "30 seconds" / "2 minutes" — for the message shown to the user. */
export function describeWait(ms) {
  const secs = Math.ceil(ms / 1000)
  if (secs < 60) return `${secs} second${secs === 1 ? '' : 's'}`
  const mins = Math.ceil(secs / 60)
  return `${mins} minute${mins === 1 ? '' : 's'}`
}
