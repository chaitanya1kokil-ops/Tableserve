import { useEffect, useMemo, useState } from 'react'
import { X, Search, Undo2, Plus, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui'

/**
 * Correct an order that has already gone out — a returned dish comes off, a
 * forgotten coffee goes on.
 *
 * Removals are voids, not deletions: the line stays on the record (it was
 * cooked) but leaves the bill. Additions are priced by the server from the
 * menu, never from anything this component sends.
 */
export default function EditOrderModal({ order, restaurant, onClose, onSaved }) {
  const toast = useToast()
  const currency = restaurant.currency
  const [menu, setMenu] = useState([])
  const [query, setQuery] = useState('')
  const [voidIds, setVoidIds] = useState(() => new Set())
  const [additions, setAdditions] = useState([]) // { menu_item_id, name, price, quantity }
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('id, name, price')
      .eq('restaurant_id', restaurant.id)
      .eq('is_available', true)
      .order('name')
      .then(({ data }) => setMenu(data || []))
  }, [restaurant.id])

  const live = (order.items || []).filter((it) => !it.voided_at)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return menu.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8)
  }, [menu, query])

  const toggleVoid = (id) =>
    setVoidIds((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const addItem = (m) => {
    setAdditions((list) => {
      const found = list.find((a) => a.menu_item_id === m.id)
      if (found) {
        return list.map((a) => (a.menu_item_id === m.id ? { ...a, quantity: a.quantity + 1 } : a))
      }
      return [...list, { menu_item_id: m.id, name: m.name, price: Number(m.price) || 0, quantity: 1 }]
    })
    setQuery('')
  }

  const bump = (id, by) =>
    setAdditions((list) =>
      list
        .map((a) => (a.menu_item_id === id ? { ...a, quantity: a.quantity + by } : a))
        .filter((a) => a.quantity > 0),
    )

  // Preview only — the server re-prices from the menu and is the source of truth.
  const removedValue = live
    .filter((it) => voidIds.has(it.id))
    .reduce((s, it) => s + (Number(it.line_total) || 0), 0)
  const addedValue = additions.reduce((s, a) => s + a.price * a.quantity, 0)
  const changed = voidIds.size > 0 || additions.length > 0

  const save = async () => {
    if (!changed) return
    setSaving(true)
    const { data, error } = await supabase.rpc('edit_order', {
      p_order_id: order.id,
      p_void: [...voidIds],
      p_add: additions.map((a) => ({ menu_item_id: a.menu_item_id, quantity: a.quantity })),
      p_reason: reason.trim() || null,
    })
    setSaving(false)
    if (error) return toast.error(error.message || 'Could not update the order.')

    const bits = []
    if (data?.voided) bits.push(`${data.voided} removed`)
    if (data?.added) bits.push(`${data.added} added`)
    toast.success(`Order updated — ${bits.join(', ')}. New total ${formatCurrency(data?.total, currency)}.`)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-stone-900">Edit order</h3>
            <p className="text-xs text-stone-400">
              {order.table?.label || order.customer_name || 'Order'} · currently{' '}
              {formatCurrency(order.total, currency)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Current lines */}
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
            On this order
          </h4>
          <div className="space-y-1.5">
            {live.length === 0 && (
              <p className="text-sm text-stone-400">Every line has been removed.</p>
            )}
            {live.map((it) => {
              const marked = voidIds.has(it.id)
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 ${
                    marked ? 'border-red-200 bg-red-50' : 'border-stone-200'
                  }`}
                >
                  <div className={`min-w-0 flex-1 ${marked ? 'opacity-60' : ''}`}>
                    <p className={`truncate text-sm text-stone-800 ${marked ? 'line-through' : ''}`}>
                      <span className="font-semibold">{it.quantity}×</span> {it.name_snapshot}
                    </p>
                  </div>
                  <span className={`text-sm tabular-nums text-stone-500 ${marked ? 'line-through' : ''}`}>
                    {formatCurrency(it.line_total, currency)}
                  </span>
                  <button
                    onClick={() => toggleVoid(it.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      marked
                        ? 'bg-white text-stone-600 ring-1 ring-stone-200'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {marked ? (
                      <span className="flex items-center gap-1">
                        <Undo2 className="h-3.5 w-3.5" /> Keep
                      </span>
                    ) : (
                      'Remove'
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add */}
          <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-stone-400">
            Add an item
          </h4>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              className="w-full rounded-xl border border-stone-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
          {results.length > 0 && (
            <div className="mt-1.5 overflow-hidden rounded-xl border border-stone-200">
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addItem(m)}
                  className="flex w-full items-center justify-between gap-3 border-b border-stone-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-stone-50"
                >
                  <span className="truncate text-stone-700">{m.name}</span>
                  <span className="whitespace-nowrap text-stone-400">
                    {formatCurrency(m.price, currency)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {additions.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {additions.map((a) => (
                <div
                  key={a.menu_item_id}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-stone-800">{a.name}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => bump(a.menu_item_id, -1)}
                      className="grid h-6 w-6 place-items-center rounded-md bg-white text-stone-600 ring-1 ring-stone-200"
                      aria-label={`One fewer ${a.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums">{a.quantity}</span>
                    <button
                      onClick={() => bump(a.menu_item_id, 1)}
                      className="grid h-6 w-6 place-items-center rounded-md bg-white text-stone-600 ring-1 ring-stone-200"
                      aria-label={`One more ${a.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm tabular-nums text-stone-600">
                    {formatCurrency(a.price * a.quantity, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Why */}
          {voidIds.size > 0 && (
            <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-stone-400">
              Reason for removing
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Returned — wrong dish"
                className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-stone-800 outline-none focus:border-brand"
              />
            </label>
          )}

          {changed && (
            <div className="mt-5 space-y-1 rounded-xl bg-stone-50 p-3 text-sm">
              {removedValue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Removed</span>
                  <span className="tabular-nums">−{formatCurrency(removedValue, currency)}</span>
                </div>
              )}
              {addedValue > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Added</span>
                  <span className="tabular-nums">+{formatCurrency(addedValue, currency)}</span>
                </div>
              )}
              <p className="pt-1 text-xs text-stone-400">
                Tax and the new total are recalculated by the server when you save.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 safe-bottom">
          <Button className="w-full" size="lg" loading={saving} disabled={!changed} onClick={save}>
            {changed ? 'Save changes' : 'No changes yet'}
          </Button>
        </div>
      </div>
    </div>
  )
}
