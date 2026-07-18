// Build a plain-text kitchen ticket for one order. Sized for a 58mm roll (32
// chars) so it's safe on 80mm too. Shared by the CloudPRNT and PrintNode paths.

function money(n, currency = 'CAD') {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(n) || 0)
  } catch {
    return '$' + (Number(n) || 0).toFixed(2)
  }
}

export function buildReceiptText(order, restaurant) {
  const W = 32
  const rule = '-'.repeat(W)
  const center = (s) => {
    s = String(s).slice(0, W)
    return ' '.repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s
  }

  const rows = []
  rows.push(center((restaurant?.name || 'Order').toUpperCase()))
  rows.push(center('#' + String(order.id).slice(-5).toUpperCase()))
  rows.push(center(new Date(order.created_at || Date.now()).toLocaleString()))
  const who = order.customer_name || order.table?.label
  if (who) rows.push(center(who))
  rows.push(rule)

  for (const it of order.items || []) {
    rows.push(`${it.quantity}x ${it.name_snapshot}`)
    const opts = Array.isArray(it.selected_options)
      ? it.selected_options.map((o) => o.value || o.name || o.label).filter(Boolean)
      : []
    for (const o of opts) rows.push(`   - ${o}`)
  }

  rows.push(rule)
  if (order.notes) rows.push(`Note: ${order.notes}`)
  rows.push(`TOTAL  ${money(order.total, restaurant?.currency)}`)

  // Trailing feed so the ticket clears the tear bar / cutter.
  return rows.join('\n') + '\n\n\n\n'
}
