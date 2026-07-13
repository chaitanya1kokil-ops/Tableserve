import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  FolderPlus,
  GripVertical,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase, uploadImage, imageUrl } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import {
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Toggle,
  Modal,
  EmptyState,
  FullPageSpinner,
  Badge,
} from '../../components/ui'
import ImageUpload from '../../components/ImageUpload'
import DietMark from '../../components/DietMark'

export default function Menu() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [optionsByItem, setOptionsByItem] = useState({})

  const [catModal, setCatModal] = useState(null) // {id?, name, brand}
  const [itemModal, setItemModal] = useState(null) // item being edited or {} for new
  const [brandTab, setBrandTab] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [cats, its, opts, vals] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', rid).order('sort_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', rid).order('sort_order'),
      supabase.from('item_options').select('*').eq('restaurant_id', rid).order('sort_order'),
      supabase.from('item_option_values').select('*').eq('restaurant_id', rid).order('sort_order'),
    ])
    setCategories(cats.data || [])
    setItems(its.data || [])

    // Build itemId -> [{...option, values: [...] }]
    const valsByOption = {}
    for (const v of vals.data || []) (valsByOption[v.option_id] ||= []).push(v)
    const byItem = {}
    for (const o of opts.data || []) {
      ;(byItem[o.item_id] ||= []).push({ ...o, values: valsByOption[o.id] || [] })
    }
    setOptionsByItem(byItem)
    setLoading(false)
  }, [rid])

  useEffect(() => {
    load()
  }, [load])

  const toggleAvailability = async (item) => {
    // Optimistic flip.
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)),
    )
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    if (error) {
      toast.error('Could not update availability.')
      load()
    }
  }

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (error) return toast.error(error.message)
    toast.success('Item deleted.')
    load()
  }

  const deleteCategory = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? Its items become uncategorized.`)) return
    const { error } = await supabase.from('menu_categories').delete().eq('id', cat.id)
    if (error) return toast.error(error.message)
    toast.success('Category deleted.')
    load()
  }

  if (loading) return <FullPageSpinner label="Loading your menu…" />

  // Brand tabs: when categories are grouped under 2+ brands, manage them
  // separately (mirrors the customer menu's brand picker).
  const brands = [...new Set(categories.map((c) => c.brand).filter(Boolean))]
  const multiBrand = brands.length > 1
  const hasUnbranded = multiBrand && categories.some((c) => !c.brand)
  const tabs = multiBrand ? [...brands, ...(hasUnbranded ? ['No brand'] : [])] : []
  const activeTab = tabs.includes(brandTab) ? brandTab : tabs[0]

  const visibleCategories = multiBrand
    ? categories.filter((c) => (c.brand || 'No brand') === activeTab)
    : categories

  // Group items by category, plus an uncategorized bucket.
  const grouped = visibleCategories.map((c) => ({
    category: c,
    items: items.filter((i) => i.category_id === c.id),
  }))
  const uncategorized = items.filter((i) => !i.category_id)

  const totalItems = items.length
  const newCategoryDefaults = {
    name: '',
    brand: multiBrand && activeTab !== 'No brand' ? activeTab : '',
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Menu</h1>
          <p className="mt-1 text-sm text-stone-500">
            {categories.length} categories · {totalItems} items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatModal(newCategoryDefaults)}>
            <FolderPlus className="h-4 w-4" /> Category
          </Button>
          <Button
            size="sm"
            onClick={() =>
              categories.length === 0
                ? toast.error('Add a category first.')
                : setItemModal({})
            }
          >
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>
      </div>

      {categories.length === 0 && uncategorized.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Your menu is empty"
          description="Start by creating a category like Starters or Mains, then add items to it."
          action={
            <Button onClick={() => setCatModal(newCategoryDefaults)}>
              <FolderPlus className="h-4 w-4" /> Create first category
            </Button>
          }
        />
      ) : (
        <div className="space-y-7">
          {multiBrand && (
            <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-stone-200">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setBrandTab(t)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                    activeTab === t ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span className="truncate">{t}</span>
                  <span className={activeTab === t ? 'text-white/60' : 'text-stone-300'}>
                    {categories.filter((c) => (c.brand || 'No brand') === t).length}
                  </span>
                </button>
              ))}
            </div>
          )}
          {grouped.map(({ category, items: catItems }) => (
            <CategorySection
              key={category.id}
              category={category}
              items={catItems}
              optionsByItem={optionsByItem}
              currency={restaurant.currency}
              onEditCategory={() => setCatModal(category)}
              onDeleteCategory={() => deleteCategory(category)}
              onAddItem={() => setItemModal({ category_id: category.id })}
              onEditItem={(it) => setItemModal(it)}
              onDeleteItem={deleteItem}
              onToggle={toggleAvailability}
            />
          ))}

          {uncategorized.length > 0 && (
            <CategorySection
              category={{ name: 'Uncategorized' }}
              items={uncategorized}
              optionsByItem={optionsByItem}
              currency={restaurant.currency}
              onAddItem={() => setItemModal({})}
              onEditItem={(it) => setItemModal(it)}
              onDeleteItem={deleteItem}
              onToggle={toggleAvailability}
            />
          )}
        </div>
      )}

      {catModal && (
        <CategoryModal
          rid={rid}
          existing={catModal.id ? catModal : null}
          defaultBrand={catModal.brand || ''}
          knownBrands={brands}
          nextSort={categories.length}
          onClose={() => setCatModal(null)}
          onSaved={() => {
            setCatModal(null)
            load()
          }}
        />
      )}

      {itemModal && (
        <ItemModal
          rid={rid}
          categories={categories}
          item={itemModal.id ? itemModal : null}
          defaultCategoryId={itemModal.category_id || visibleCategories[0]?.id || categories[0]?.id || null}
          existingOptions={itemModal.id ? optionsByItem[itemModal.id] || [] : []}
          nextSort={items.length}
          onClose={() => setItemModal(null)}
          onSaved={() => {
            setItemModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}

/* ----------------------------------------------------------- Category UI -- */
function CategorySection({
  category,
  items,
  optionsByItem,
  currency,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggle,
}) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-100 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-xl font-semibold text-stone-900">{category.name}</h2>
          <span className="text-xs font-medium text-stone-400">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onEditCategory && (
            <button onClick={onEditCategory} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDeleteCategory && (
            <button onClick={onDeleteCategory} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4" /> Item
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
          No items yet — add the first one.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              optionCount={(optionsByItem[item.id] || []).length}
              currency={currency}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item)}
              onToggle={() => onToggle(item)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ItemCard({ item, optionCount, currency, onEdit, onDelete, onToggle }) {
  return (
    <div
      className={`flex gap-3 rounded-2xl p-3 ring-1 transition hover:shadow-md ${
        item.is_available ? 'bg-white ring-stone-100' : 'bg-stone-50 opacity-75 ring-stone-200/70'
      }`}
    >
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {item.image_url ? (
          <img src={imageUrl(item.image_url)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-stone-300">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 font-semibold text-stone-900">
            <DietMark diet={item.diet} />
            <span className="truncate">{item.name}</span>
          </p>
          <span className="whitespace-nowrap font-bold text-brand">
            {formatCurrency(item.price, currency)}
          </span>
        </div>
        {item.description && (
          <p className="line-clamp-2 text-xs text-stone-500">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Toggle checked={item.is_available} onChange={onToggle} label="Available" />
            <span className={`text-xs font-medium ${item.is_available ? 'text-emerald-600' : 'text-stone-400'}`}>
              {item.is_available ? 'Available' : 'Hidden'}
            </span>
            {optionCount > 0 && (
              <Badge className="bg-stone-100 text-stone-600">
                {optionCount} {optionCount === 1 ? 'option' : 'options'}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryModal({ rid, existing, defaultBrand, knownBrands = [], nextSort, onClose, onSaved }) {
  const toast = useToast()
  const [name, setName] = useState(existing?.name || '')
  const [brand, setBrand] = useState(existing?.brand ?? defaultBrand ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return toast.error('Enter a category name.')
    setSaving(true)
    const payload = { name: name.trim(), brand: brand.trim() || null }
    const { error } = existing
      ? await supabase.from('menu_categories').update(payload).eq('id', existing.id)
      : await supabase
          .from('menu_categories')
          .insert({ ...payload, restaurant_id: rid, sort_order: nextSort })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(existing ? 'Category updated.' : 'Category added.')
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit category' : 'New category'}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Category name" required>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Starters"
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </Field>
        <Field
          label="Brand (optional)"
          hint="Run two menus from one QR by grouping categories under brand names. Guests pick a brand first when 2+ exist."
        >
          <Input
            list="menu-brand-suggestions"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Royal Paan"
          />
          <datalist id="menu-brand-suggestions">
            {knownBrands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
      </div>
    </Modal>
  )
}

/* --------------------------------------------------------------- Item UI -- */
function ItemModal({
  rid,
  categories,
  item,
  defaultCategoryId,
  existingOptions,
  nextSort,
  onClose,
  onSaved,
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price ?? '',
    category_id: item?.category_id || defaultCategoryId || '',
    is_available: item?.is_available ?? true,
    diet: item?.diet || '',
  })
  const [photoFile, setPhotoFile] = useState(undefined) // undefined=unchanged, null=remove, File=new
  const [groups, setGroups] = useState(() =>
    (existingOptions || []).map((o) => ({
      name: o.name,
      selection_type: o.selection_type,
      is_required: o.is_required,
      values: (o.values || []).map((v) => ({ name: v.name, price_delta: v.price_delta })),
    })),
  )
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    if (!form.name.trim()) return toast.error('Enter an item name.')
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) return toast.error('Enter a valid price.')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        category_id: form.category_id || null,
        is_available: form.is_available,
        diet: form.diet || null,
      }

      let itemId = item?.id
      if (itemId) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', itemId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert({ ...payload, restaurant_id: rid, sort_order: nextSort })
          .select()
          .single()
        if (error) throw error
        itemId = data.id
      }

      // Photo
      if (photoFile instanceof File) {
        const path = await uploadImage(photoFile, `${rid}/items`, itemId)
        await supabase.from('menu_items').update({ image_url: path }).eq('id', itemId)
      } else if (photoFile === null) {
        await supabase.from('menu_items').update({ image_url: null }).eq('id', itemId)
      }

      // Modifiers: delete + recreate (order snapshots are unaffected).
      await supabase.from('item_options').delete().eq('item_id', itemId)
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi]
        if (!g.name.trim()) continue
        const { data: opt, error: oErr } = await supabase
          .from('item_options')
          .insert({
            restaurant_id: rid,
            item_id: itemId,
            name: g.name.trim(),
            selection_type: g.selection_type,
            is_required: g.is_required,
            sort_order: gi,
          })
          .select()
          .single()
        if (oErr) throw oErr
        const values = g.values
          .filter((v) => v.name.trim())
          .map((v, vi) => ({
            restaurant_id: rid,
            option_id: opt.id,
            name: v.name.trim(),
            price_delta: parseFloat(v.price_delta) || 0,
            sort_order: vi,
          }))
        if (values.length) {
          const { error: vErr } = await supabase.from('item_option_values').insert(values)
          if (vErr) throw vErr
        }
      }

      toast.success(item ? 'Item saved.' : 'Item added.')
      onSaved()
    } catch (err) {
      toast.error(err.message || 'Could not save item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Edit item' : 'New item'}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            Save item
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[120px,1fr]">
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Photo</p>
            <ImageUpload value={item?.image_url} onChange={setPhotoFile} shape="square" label="Photo" />
          </div>
          <div className="space-y-4">
            <Field label="Name" required>
              <Input value={form.name} onChange={set('name')} placeholder="Margherita Pizza" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price" required>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={set('price')}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Category">
                <Select value={form.category_id} onChange={set('category_id')}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </div>

        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={set('description')}
            placeholder="Fresh basil, mozzarella, San Marzano tomato."
          />
        </Field>

        <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">Available to order</span>
          <Toggle
            checked={form.is_available}
            onChange={(v) => setForm({ ...form, is_available: v })}
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Dietary label</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['', 'Not set'],
              ['veg', 'Veg'],
              ['non_veg', 'Non-veg'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value || 'none'}
                onClick={() => setForm({ ...form, diet: value })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  form.diet === value
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {value && <DietMark diet={value} />}
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Guests see the green/red mark next to the item name.
          </p>
        </div>

        <ModifiersEditor groups={groups} setGroups={setGroups} />
      </div>
    </Modal>
  )
}

/* --------------------------------------------------------- Modifiers UI --- */
function ModifiersEditor({ groups, setGroups }) {
  const addGroup = () =>
    setGroups([
      ...groups,
      { name: '', selection_type: 'single', is_required: false, values: [{ name: '', price_delta: '' }] },
    ])

  const updateGroup = (gi, patch) =>
    setGroups(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)))

  const removeGroup = (gi) => setGroups(groups.filter((_, i) => i !== gi))

  const addValue = (gi) =>
    updateGroup(gi, { values: [...groups[gi].values, { name: '', price_delta: '' }] })

  const updateValue = (gi, vi, patch) =>
    updateGroup(gi, {
      values: groups[gi].values.map((v, i) => (i === vi ? { ...v, ...patch } : v)),
    })

  const removeValue = (gi, vi) =>
    updateGroup(gi, { values: groups[gi].values.filter((_, i) => i !== vi) })

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Options & modifiers</p>
        <Button variant="ghost" size="sm" onClick={addGroup}>
          <Plus className="h-4 w-4" /> Group
        </Button>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        e.g. Size (single choice), Extras (multiple), Spice level.
      </p>

      {groups.length === 0 && (
        <p className="rounded-lg bg-gray-50 px-3 py-3 text-center text-xs text-gray-400">
          No options. The item is ordered as-is.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-300" />
              <Input
                value={g.name}
                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                placeholder="Group name (e.g. Size)"
                className="flex-1"
              />
              <button
                onClick={() => removeGroup(gi)}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 pl-6 text-xs">
              <select
                value={g.selection_type}
                onChange={(e) => updateGroup(gi, { selection_type: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1"
              >
                <option value="single">Choose one</option>
                <option value="multiple">Choose many</option>
              </select>
              <label className="flex items-center gap-1.5 text-gray-600">
                <input
                  type="checkbox"
                  checked={g.is_required}
                  onChange={(e) => updateGroup(gi, { is_required: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Required
              </label>
            </div>

            <div className="mt-2 space-y-2 pl-6">
              {g.values.map((v, vi) => (
                <div key={vi} className="flex items-center gap-2">
                  <Input
                    value={v.name}
                    onChange={(e) => updateValue(gi, vi, { name: e.target.value })}
                    placeholder="Choice (e.g. Large)"
                    className="flex-1"
                  />
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      +
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      value={v.price_delta}
                      onChange={(e) => updateValue(gi, vi, { price_delta: e.target.value })}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                  <button
                    onClick={() => removeValue(gi, vi)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addValue(gi)}>
                <Plus className="h-3.5 w-3.5" /> Add choice
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
