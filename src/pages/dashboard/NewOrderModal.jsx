import { useEffect, useState } from 'react'
import { X, Plus, Minus, Search, Trash2, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { Button, Select, Textarea, FullPageSpinner } from '../../components/ui'

// Same line shape the customer cart uses, so place_order gets consistent data.
function makeLine(item, options, quantity) {
  const delta = options.reduce((s, o) => s + Number(o.priceDelta || 0), 0)
  const unitPrice = Number(item.price) + delta
  return {
    lineId: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: item.id,
    name: item.name,
    options, // [{ group, value, priceDelta }]
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
  }
}

export default function NewOrderModal({ restaurant, onClose, onPlaced }) {
  const toast = useToast()
  const currency = restaurant.currency || 'USD'

  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [optionsByItem, setOptionsByItem] = useState({})

  const [tableId, setTableId] = useState('')
  const [cart, setCart] = useState([])
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [pendingItem, setPendingItem] = useState(null)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    ;(async () => {
      const rid = restaurant.id
      const [tbls, cats, its, opts, vals] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', rid).order('label'),
        supabase.from('menu_categories').select('*').eq('restaurant_id', rid).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', rid).eq('is_available', true).order('sort_order'),
        supabase.from('item_options').select('*').eq('restaurant_id', rid).order('sort_order'),
        supabase.from('item_option_values').select('*').eq('restaurant_id', rid).order('sort_order'),
      ])
      setTables(tbls.data || [])
      setCategories(cats.data || [])
      setItems(its.data || [])
      const valsByOption = {}
      for (const v of vals.data || []) (valsByOption[v.option_id] ||= []).push(v)
      const byItem = {}
      for (const o of opts.data || []) (byItem[o.item_id] ||= []).push({ ...o, values: valsByOption[o.id] || [] })
      setOptionsByItem(byItem)
      if ((tbls.data || []).length === 1) setTableId(tbls.data[0].id)
      setLoading(false)
    })()
  }, [restaurant.id])

  const cartCount = cart.reduce((n, l) => n + l.quantity, 0)
  const taxRate = Number(restaurant.tax_rate) || 0
  const cartSubtotal = cart.reduce((s, l) => s + l.lineTotal, 0)
  const cartTax = Math.round(cartSubtotal * taxRate) / 100
  const cartTotal = cartSubtotal + cartTax

  const addLine = (line) => setCart((c) => [...c, line])
  const removeLine = (lineId) => setCart((c) => c.filter((l) => l.lineId !== lineId))
  const changeQty = (lineId, delta) =>
    setCart((c) =>
      c.map((l) => {
        if (l.lineId !== lineId) return l
        const q = Math.max(1, l.quantity + delta)
        return { ...l, quantity: q, lineTotal: l.unitPrice * q }
      }),
    )

  const quickAdd = (item) => {
    const groups = optionsByItem[item.id] || []
    if (groups.length) setPendingItem(item)
    else addLine(makeLine(item, [], 1))
  }

  const place = async () => {
    if (!tableId) return toast.error('Select a table first.')
    if (cart.length === 0) return toast.error('Add at least one item.')
    setPlacing(true)
    const p_items = cart.map((l) => ({
      menu_item_id: l.itemId,
      name_snapshot: l.name,
      unit_price: l.unitPrice,
      quantity: l.quantity,
      selected_options: l.options,
      line_total: l.lineTotal,
    }))
    const { error } = await supabase.rpc('place_order', {
      p_restaurant_id: restaurant.id,
      p_table_id: tableId,
      p_items,
      p_notes: notes.trim() || null,
    })
    setPlacing(false)
    if (error) return toast.error(error.message || 'Could not place order.')
    toast.success('Order placed.')
    onPlaced?.()
    onClose()
  }

  const grouped = categories
    .map((c) => ({
      category: c,
      items: items.filter(
        (i) => i.category_id === c.id && i.name.toLowerCase().includes(query.toLowerCase()),
      ),
    }))
    .filter((g) => g.items.length > 0)
  const uncategorized = items.filter(
    (i) => !i.category_id && i.name.toLowerCase().includes(query.toLowerCase()),
  )
  if (uncategorized.length) grouped.push({ category: { id: 'uncat', name: 'More' }, items: uncategorized })

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40 sm:items-center sm:justify-center sm:p-4">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white sm:h-[90vh] sm:max-w-4xl sm:flex-none sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-lg font-bold text-gray-900">New order</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <FullPageSpinner label="Loading menu…" />
        ) : (
          <>
            {/* Table picker — full-width, on top for both mobile & desktop */}
            <div className="border-b border-gray-100 p-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Table</label>
              <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">Select a table…</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Content: single scroll on mobile, two columns on desktop */}
            <div className="min-h-0 flex-1 overflow-y-auto lg:flex lg:overflow-hidden">
              {/* Menu */}
              <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-gray-100">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search menu…"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="space-y-5">
                  {grouped.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">No items found.</p>
                  ) : (
                    grouped.map(({ category, items: catItems }) => (
                      <div key={category.id}>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                          {category.name}
                        </h3>
                        <div className="space-y-2">
                          {catItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => quickAdd(item)}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-left transition hover:border-brand/40 hover:bg-brand/5"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-gray-900">
                                  {item.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(item.price, currency)}
                                  {(optionsByItem[item.id] || []).length > 0 && ' · options'}
                                </span>
                              </span>
                              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-brand text-white">
                                <Plus className="h-4 w-4" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Cart */}
              <div className="border-t border-gray-100 p-3 lg:min-h-0 lg:w-[340px] lg:overflow-y-auto lg:border-t-0">
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    Tap items above to build the order.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((l) => (
                      <div key={l.lineId} className="rounded-xl border border-gray-100 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{l.name}</p>
                            {l.options.length > 0 && (
                              <p className="truncate text-xs text-gray-500">
                                {l.options.map((o) => o.value).join(', ')}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeLine(l.lineId)}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => changeQty(l.lineId, -1)}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                            <button
                              onClick={() => changeQty(l.lineId, 1)}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(l.lineTotal, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Order notes (optional)…"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sticky action bar — full width, visible on every screen size */}
            <div className="border-t border-gray-100 p-3 safe-bottom">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {cartCount} item{cartCount === 1 ? '' : 's'}
                  {taxRate > 0 && cartCount > 0 && (
                    <span className="block text-xs text-gray-400">
                      {formatCurrency(cartSubtotal, currency)} + {formatCurrency(cartTax, currency)}{' '}
                      tax ({taxRate}%)
                    </span>
                  )}
                </span>
                <span className="text-lg font-extrabold text-gray-900">
                  {formatCurrency(cartTotal, currency)}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                loading={placing}
                disabled={cart.length === 0 || !tableId}
                onClick={place}
              >
                Place order
              </Button>
            </div>
          </>
        )}
      </div>

      {pendingItem && (
        <ItemOptions
          item={pendingItem}
          groups={optionsByItem[pendingItem.id] || []}
          currency={currency}
          onCancel={() => setPendingItem(null)}
          onAdd={(line) => {
            addLine(line)
            setPendingItem(null)
          }}
        />
      )}
    </div>
  )
}

function ItemOptions({ item, groups, currency, onCancel, onAdd }) {
  // selection[groupId] = valueId (single) or { [valueId]: true } (multiple)
  const [selection, setSelection] = useState({})
  const [quantity, setQuantity] = useState(1)

  const toggle = (group, value) => {
    setSelection((s) => {
      if (group.selection_type === 'multiple') {
        const cur = { ...(s[group.id] || {}) }
        cur[value.id] = !cur[value.id]
        return { ...s, [group.id]: cur }
      }
      return { ...s, [group.id]: value.id }
    })
  }

  const chosen = []
  for (const g of groups) {
    const sel = selection[g.id]
    if (g.selection_type === 'multiple') {
      for (const v of g.values) if (sel?.[v.id]) chosen.push({ group: g.name, value: v.name, priceDelta: Number(v.price_delta) })
    } else if (sel) {
      const v = g.values.find((x) => x.id === sel)
      if (v) chosen.push({ group: g.name, value: v.name, priceDelta: Number(v.price_delta) })
    }
  }

  const missingRequired = groups.some(
    (g) =>
      g.is_required &&
      (g.selection_type === 'multiple'
        ? !Object.values(selection[g.id] || {}).some(Boolean)
        : !selection[g.id]),
  )

  const delta = chosen.reduce((s, o) => s + o.priceDelta, 0)
  const unit = Number(item.price) + delta

  const isSelected = (group, value) =>
    group.selection_type === 'multiple' ? Boolean(selection[group.id]?.[value.id]) : selection[group.id] === value.id

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
          <button onClick={onCancel} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="font-bold text-gray-900">{item.name}</h3>
        </div>

        <div className="space-y-4 p-5">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mb-2 text-sm font-semibold text-gray-700">
                {g.name}
                {g.is_required && <span className="ml-1 text-xs text-red-500">required</span>}
                <span className="ml-1 text-xs font-normal text-gray-400">
                  {g.selection_type === 'multiple' ? '· choose any' : '· choose one'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {g.values.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => toggle(g, v)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      isSelected(g, v)
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {v.name}
                    {Number(v.price_delta) !== 0 && (
                      <span className="ml-1 text-xs text-gray-400">
                        {Number(v.price_delta) > 0 ? '+' : ''}
                        {formatCurrency(v.price_delta, currency)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-100 bg-white p-4 safe-bottom">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-bold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="flex-1"
            disabled={missingRequired}
            onClick={() => onAdd(makeLine(item, chosen, quantity))}
          >
            Add · {formatCurrency(unit * quantity, currency)}
          </Button>
        </div>
      </div>
    </div>
  )
}
