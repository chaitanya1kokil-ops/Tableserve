// Bill-splitting math for the checkout. Kept free of React and Supabase so the
// money rules can be tested directly — settle_tab rejects a split whose parts
// don't sum to the amount due to the cent, so these are load-bearing.

export const round2 = (n) => Math.round(n * 100) / 100

// Split a total into n even parts that sum exactly to the total.
export function evenSplit(total, n) {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  return Array.from({ length: n }, (_, i) => ((base + (i === 0 ? cents - base * n : 0)) / 100).toFixed(2))
}

// Expand each line into one row per unit, so a "2× Vada Pav" can go to two
// different payers. Unit price is the line divided by its quantity, which keeps
// per-item option pricing intact. `compItemId` (a loyalty reward) is excluded —
// nobody pays for it.
export function toUnits(orders, compItemId) {
  const units = []
  for (const o of orders) {
    for (const it of o.items || []) {
      if (it.id === compItemId) continue
      const qty = Math.max(1, it.quantity || 1)
      const each = (Number(it.line_total) || 0) / qty
      for (let n = 0; n < qty; n++) {
        units.push({ key: `${it.id}#${n}`, itemId: it.id, name: it.name_snapshot, each })
      }
    }
  }
  return units
}

// Turn item assignments into per-payer amounts. Each payer's share of `due` is
// proportional to the pre-tax value they took, which spreads tax and rounding
// without needing the tax rate here. The remainder lands on the first payer so
// the parts always sum to `due` exactly.
export function amountsFromAssignment(units, assignment, payerCount, due) {
  const base = Array(payerCount).fill(0)
  let assignedBase = 0
  for (const u of units) {
    const p = assignment[u.key]
    if (p == null || p >= payerCount) continue
    base[p] += u.each
    assignedBase += u.each
  }
  if (assignedBase <= 0) return { amounts: Array(payerCount).fill('0.00'), base }

  const dueCents = Math.round(due * 100)
  const cents = base.map((b) => Math.round((b / assignedBase) * dueCents))
  cents[0] += dueCents - cents.reduce((s, c) => s + c, 0)
  return { amounts: cents.map((c) => (c / 100).toFixed(2)), base }
}

// Where a split tab stands while staff work down the table. `collected` is a
// sparse array of booleans indexed by payer. A split tab must not close until
// every payer has handed their share over.
export function collectionState(payments, collected) {
  const split = payments.length > 1
  const outstanding = split ? payments.filter((_, i) => !collected[i]).length : 0
  const collectedTotal = round2(
    payments.reduce((s, p, i) => s + (collected[i] ? Number(p.amount) || 0 : 0), 0),
  )
  return { split, outstanding, collectedTotal, allCollected: !split || outstanding === 0 }
}

// A line split across payers is billed to whoever took the most of it, so no
// item is ever charged to two payers — settle_tab rejects that.
export function itemOwners(units, assignment) {
  const tally = {}
  for (const u of units) {
    const p = assignment[u.key]
    if (p == null) continue
    ;((tally[u.itemId] ||= {})[p] ||= 0)
    tally[u.itemId][p] += u.each
  }
  const owner = {}
  for (const [itemId, byPayer] of Object.entries(tally)) {
    owner[itemId] = Number(Object.entries(byPayer).sort((a, b) => b[1] - a[1])[0][0])
  }
  return owner
}
