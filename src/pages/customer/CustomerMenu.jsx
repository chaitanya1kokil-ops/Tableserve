import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Minus,
  UtensilsCrossed,
  X,
  ArrowRight,
  Store,
  AlertTriangle,
  Bell,
  Receipt,
  ShoppingBag,
  Star,
} from 'lucide-react'
import { supabase, imageUrl } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Button, FullPageSpinner } from '../../components/ui'
import DietMark from '../../components/DietMark'
import { allowsLoyalty } from '../../lib/constants'

export default function CustomerMenu() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { ready, error: sessionError } = useCustomerSession()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [table, setTable] = useState(null)
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [optionsByItem, setOptionsByItem] = useState({})
  const [notFound, setNotFound] = useState(false)

  const [cart, setCart] = useCart(restaurantId, tableId)
  const [activeItem, setActiveItem] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [calling, setCalling] = useState(false)
  const [brandChoice, setBrandChoice] = useState(null)
  const [loyaltyMember, setLoyaltyMember] = useState(null) // {id,name,email,visits}
  const [loyaltyOpen, setLoyaltyOpen] = useState(false)

  const loyaltyKey = `tableserve:loyalty:${restaurantId}`
  const saveMember = useCallback(
    (m) => {
      setLoyaltyMember(m)
      try {
        if (m) localStorage.setItem(loyaltyKey, JSON.stringify(m))
      } catch {
        /* ignore */
      }
    },
    [loyaltyKey],
  )

  // Remember the member on this device, then refresh their visit count.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(loyaltyKey)
      if (raw) setLoyaltyMember(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [loyaltyKey])

  useEffect(() => {
    if (!ready || !loyaltyMember?.id) return
    supabase.rpc('loyalty_status', { p_member: loyaltyMember.id }).then(({ data }) => {
      if (data) saveMember(data)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loyaltyMember?.id])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .maybeSingle()

    if (!rest) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setRestaurant(rest)

    if (tableId) {
      const { data: t } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle()
      setTable(t || null)
    }

    const [cats, its, opts, vals] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('sort_order'),
      supabase.from('item_options').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('item_option_values').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
    ])

    setCategories(cats.data || [])
    setItems(its.data || [])

    const valsByOption = {}
    for (const v of vals.data || []) {
      ;(valsByOption[v.option_id] ||= []).push(v)
    }
    const byItem = {}
    for (const o of opts.data || []) {
      ;(byItem[o.item_id] ||= []).push({ ...o, values: valsByOption[o.id] || [] })
    }
    setOptionsByItem(byItem)

    setLoading(false)
  }, [restaurantId, tableId])

  useEffect(() => {
    if (ready) load()
  }, [ready, load])

  // Single-brand restaurants with loyalty enabled prompt right after the menu
  // loads (multi-brand ones prompt when the loyalty brand is picked).
  useEffect(() => {
    if (loading || !restaurant?.loyalty_brand || !allowsLoyalty(restaurant) || loyaltyMember) return
    const hasBrands = new Set(categories.map((c) => c.brand).filter(Boolean)).size > 1
    if (!hasBrands) maybePromptLoyalty(restaurant.loyalty_brand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, restaurant?.loyalty_brand])

  const accent = restaurant?.accent_color || '#b45309'
  const currency = restaurant?.currency || 'USD'
  const isTruck = restaurant?.business_type === 'food_truck'
  // Trucks order from one QR (no table); restaurants need a scanned table.
  const canOrder = (Boolean(tableId) || isTruck) && restaurant?.status === 'active'

  const cartCount = cart.reduce((n, l) => n + l.quantity, 0)
  const cartTotal = cart.reduce((s, l) => s + l.lineTotal, 0)

  const addToCart = (line) => {
    setCart((c) => [...c, line])
    toast.success('Added to cart')
  }

  const callServer = async () => {
    if (calling) return
    setCalling(true)
    const { error } = await supabase.from('server_calls').insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      customer_id: session?.user?.id,
    })
    setCalling(false)
    if (error) toast.error('Could not reach the server. Please try again.')
    else toast.success('Your server has been notified 🙌')
  }

  // --- gates -----------------------------------------------------------------
  if (sessionError) return <SessionErrorScreen error={sessionError} />
  if (!ready || loading) return <FullPageSpinner label="Loading menu…" />
  if (notFound) return <NotFoundScreen />

  if (restaurant.status !== 'active') {
    return (
      <CenteredCard
        icon={AlertTriangle}
        title={`${restaurant.name} isn’t taking orders`}
        text="This restaurant is currently unavailable. Please check back later."
      />
    )
  }

  const grouped = categories
    .map((c) => ({ category: c, items: items.filter((i) => i.category_id === c.id) }))
    .filter((g) => g.items.length > 0)
  const uncategorized = items.filter((i) => !i.category_id)
  if (uncategorized.length) grouped.push({ category: { id: 'uncat', name: 'More' }, items: uncategorized })

  // Multi-brand menus: when categories carry 2+ brand names, guests pick a
  // brand first and can switch any time. Uncategorized items show everywhere.
  const brands = [...new Set(categories.map((c) => c.brand).filter(Boolean))]
  const multiBrand = brands.length > 1
  const visibleGrouped =
    multiBrand && brandChoice
      ? grouped.filter((g) => !g.category.brand || g.category.brand === brandChoice)
      : grouped

  const maybePromptLoyalty = (brand) => {
    if (!restaurant?.loyalty_brand || !allowsLoyalty(restaurant)) return
    if (brand !== restaurant.loyalty_brand) return
    if (loyaltyMember) return
    try {
      if (localStorage.getItem(`ts-loyalty-dismissed-${restaurantId}`)) return
    } catch {
      /* ignore */
    }
    setLoyaltyOpen(true)
  }

  const pickBrand = (b) => {
    setBrandChoice(b)
    window.scrollTo({ top: 0 })
    maybePromptLoyalty(b)
  }

  const dismissLoyalty = () => {
    setLoyaltyOpen(false)
    // Persistent: decliners are not re-asked; the ⭐ Rewards pill stays
    // available if they change their mind.
    try {
      localStorage.setItem(`ts-loyalty-dismissed-${restaurantId}`, '1')
    } catch {
      /* ignore */
    }
  }

  // Post-order: the order is linked now, but the visit itself counts when the
  // bill is settled at the counter — tell the guest that honestly.
  const afterOrderLoyalty = () => {
    if (!loyaltyMember?.id) return
    toast.success('⭐ Order linked to your rewards — the visit counts when your bill is paid.')
  }

  return (
    <div className="min-h-[100dvh] bg-[#faf6ef] pb-28" style={{ '--brand': accent }}>
      <BrandHeader
        restaurant={restaurant}
        table={table}
        accent={accent}
        canCall={canOrder}
        calling={calling}
        onCall={callServer}
        onViewOrders={
          tableId
            ? () => navigate(`/r/${restaurantId}/t/${tableId}/status`)
            : isTruck
              ? () => navigate(`/r/${restaurantId}/status`)
              : null
        }
      />

      {!tableId && !isTruck && (
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Browsing only — scan a table’s QR code to place an order.
          </div>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <CenteredCard icon={UtensilsCrossed} title="Menu coming soon" text="This restaurant hasn’t added items yet." inline />
        </div>
      ) : multiBrand && !brandChoice ? (
        <BrandPicker
          brands={brands}
          categories={categories}
          items={items}
          accent={accent}
          onPick={pickBrand}
        />
      ) : (
        <>
          {restaurant.loyalty_brand && allowsLoyalty(restaurant) && (!multiBrand || brandChoice === restaurant.loyalty_brand) && (
            <div className="mx-auto max-w-2xl px-4 pt-3">
              {loyaltyMember ? (
                <div className="relative overflow-hidden rounded-2xl bg-stone-900 px-4 py-2.5 text-white">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(120% 100% at 100% 0%, ${accent}59, transparent 60%)` }}
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <Star className="h-4 w-4 flex-shrink-0 text-amber-300" />
                      <span className="truncate">
                        {loyaltyMember.name || 'Member'} · {loyaltyMember.visits}{' '}
                        {loyaltyMember.visits === 1 ? 'visit' : 'visits'}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-xs font-semibold text-amber-200/90">
                      {loyaltyMember.rewards_available > 0
                        ? `${loyaltyMember.rewards_available} reward${loyaltyMember.rewards_available === 1 ? '' : 's'} ready 🎉`
                        : `${(loyaltyMember.reward_every || 10) - ((loyaltyMember.visits || 0) % (loyaltyMember.reward_every || 10))} visit${(loyaltyMember.reward_every || 10) - ((loyaltyMember.visits || 0) % (loyaltyMember.reward_every || 10)) === 1 ? '' : 's'} to go`}
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setLoyaltyOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 transition active:scale-[.99]"
                >
                  <Star className="h-4 w-4 text-amber-500" />
                  {restaurant.loyalty_brand} Rewards — earn {restaurant.loyalty_reward || 'a reward'} every{' '}
                  {restaurant.loyalty_reward_every || 10} visits
                </button>
              )}
            </div>
          )}
          <CategoryNav
            groups={visibleGrouped}
            brands={multiBrand ? brands : []}
            activeBrand={brandChoice}
            onBrandChange={pickBrand}
          />
          <div className="mx-auto max-w-2xl space-y-8 px-4 py-5">
            {visibleGrouped.map(({ category, items: catItems }) => (
              <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-28">
                <h2 className="mb-3 font-display text-2xl font-semibold text-stone-900">
                  {category.name}
                  <span
                    className="mt-1.5 block h-[3px] w-9 rounded-full opacity-80"
                    style={{ backgroundColor: accent }}
                  />
                </h2>
                <div className="space-y-3">
                  {catItems.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      hasOptions={(optionsByItem[item.id] || []).length > 0}
                      currency={currency}
                      onOpen={() => setActiveItem(item)}
                      onQuickAdd={
                        canOrder
                          ? () => {
                              const groups = optionsByItem[item.id] || []
                              if (groups.length) setActiveItem(item)
                              else
                                addToCart(makeLine(item, [], 1))
                            }
                          : null
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* Cart bar */}
      {canOrder && cartCount > 0 && !cartOpen && !activeItem && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-4 pb-4 safe-bottom">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-white shadow-xl transition active:scale-[.99]"
            style={{ backgroundColor: accent }}
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 text-sm">
                {cartCount}
              </span>
              View cart
            </span>
            <span className="font-bold">{formatCurrency(cartTotal, currency)}</span>
          </button>
        </div>
      )}

      {activeItem && (
        <ItemModal
          item={activeItem}
          groups={optionsByItem[activeItem.id] || []}
          currency={currency}
          accent={accent}
          canOrder={canOrder}
          onClose={() => setActiveItem(null)}
          onAdd={(line) => {
            addToCart(line)
            setActiveItem(null)
          }}
        />
      )}

      {cartOpen && (
        <CartSheet
          cart={cart}
          setCart={setCart}
          currency={currency}
          accent={accent}
          taxRate={Number(restaurant.tax_rate) || 0}
          loyaltyMemberId={loyaltyMember?.id || null}
          loyaltyEnabled={Boolean(restaurant.loyalty_brand) && allowsLoyalty(restaurant)}
          loyaltyName={loyaltyMember?.name || ''}
          onJoinLoyalty={() => setLoyaltyOpen(true)}
          isTruck={isTruck}
          restaurantId={restaurantId}
          tableId={tableId}
          onClose={() => setCartOpen(false)}
          onPlaced={() => {
            setCart([])
            setCartOpen(false)
            afterOrderLoyalty()
            navigate(tableId ? `/r/${restaurantId}/t/${tableId}/status` : `/r/${restaurantId}/status`)
          }}
        />
      )}

      {loyaltyOpen && (
        <LoyaltyModal
          restaurant={restaurant}
          accent={accent}
          onClose={dismissLoyalty}
          onJoined={(m) => saveMember(m)}
        />
      )}
    </div>
  )
}

/* ---------------------------------------------------------- cart helpers -- */
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

function useCart(restaurantId, tableId) {
  const key = `tableserve:cart:${restaurantId}:${tableId || 'none'}`
  const [cart, setCartState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  })
  const setCart = useCallback(
    (updater) => {
      setCartState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* ignore quota errors */
        }
        return next
      })
    },
    [key],
  )
  return [cart, setCart]
}

/* --------------------------------------------------------------- header --- */
function BrandHeader({ restaurant, table, accent, canCall, calling, onCall, onViewOrders }) {
  return (
    <header className="relative overflow-hidden bg-stone-900 text-white">
      {/* ember glow tinted by the restaurant accent */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 85% -10%, ${accent}59, transparent 60%), radial-gradient(90% 70% at -10% 115%, ${accent}33, transparent 65%)`,
        }}
      />
      <div className="relative mx-auto max-w-2xl px-4 pb-6 pt-7">
        <div className="flex items-center gap-4">
          {restaurant.logo_url ? (
            <img
              src={imageUrl(restaurant.logo_url)}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/25"
            />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <Store className="h-7 w-7" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {restaurant.cuisine && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                {restaurant.cuisine}
              </p>
            )}
            <h1 className="truncate font-display text-[1.75rem] font-semibold leading-tight">
              {restaurant.name}
            </h1>
          </div>
          {restaurant.google_review_url && (
            <a
              href={restaurant.google_review_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Leave a Google review"
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur transition active:scale-95"
            >
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              Reviews
            </a>
          )}
        </div>
        {restaurant.description && (
          <p className="mt-3 text-sm leading-relaxed text-white/70">{restaurant.description}</p>
        )}
        {table && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
              <UtensilsCrossed className="h-4 w-4" /> {table.label}
            </span>
            {canCall && (
              <button
                onClick={onCall}
                disabled={calling}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-60"
                style={{ color: accent }}
              >
                <Bell className="h-4 w-4" /> {calling ? 'Calling…' : 'Call server'}
              </button>
            )}
            {onViewOrders && (
              <button
                onClick={onViewOrders}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm transition active:scale-95"
                style={{ color: accent }}
              >
                <Receipt className="h-4 w-4" /> My orders
              </button>
            )}
          </div>
        )}
      </div>
      {/* gold hairline */}
      <div
        className="relative h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
    </header>
  )
}

function CategoryNav({ groups, brands = [], activeBrand, onBrandChange }) {
  const [active, setActive] = useState(groups[0]?.category.id)
  const navRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) {
          const id = visible[0].target.id.replace('cat-', '')
          setActive(id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    groups.forEach((g) => {
      const el = document.getElementById(`cat-${g.category.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [groups])

  const jump = (id) => {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#faf6ef]/95 backdrop-blur">
      {brands.length > 1 && (
        <div className="mx-auto flex max-w-2xl gap-1.5 px-4 pt-2.5">
          {brands.map((b) => (
            <button
              key={b}
              onClick={() => onBrandChange(b)}
              className={`flex-1 truncate rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                b === activeBrand
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-500 ring-1 ring-stone-200'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}
      <div ref={navRef} className="no-scrollbar mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3">
        {groups.map(({ category }) => (
          <button
            key={category.id}
            onClick={() => jump(category.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              active === category.id
                ? 'bg-brand text-white shadow-sm'
                : 'bg-white text-stone-600 ring-1 ring-stone-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function MenuItemRow({ item, hasOptions, currency, onOpen, onQuickAdd }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100 transition duration-200 hover:shadow-md active:scale-[.995]">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-1.5 font-bold text-stone-900">
          <DietMark diet={item.diet} />
          <span className="truncate">{item.name}</span>
        </p>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{item.description}</p>
        )}
        <p className="mt-1.5 font-semibold text-brand">{formatCurrency(item.price, currency)}</p>
      </button>
      <div className="relative flex-shrink-0">
        <button onClick={onOpen} className="block h-24 w-24 overflow-hidden rounded-xl bg-gray-100">
          {item.image_url ? (
            <img src={imageUrl(item.image_url)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-gray-300">
              <UtensilsCrossed className="h-7 w-7" />
            </span>
          )}
        </button>
        {onQuickAdd && (
          <button
            onClick={onQuickAdd}
            className="absolute -bottom-2 right-1.5 grid h-9 w-9 place-items-center rounded-full bg-brand text-white shadow-md ring-2 ring-white active:scale-95"
            aria-label={hasOptions ? 'Choose options' : 'Add to cart'}
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- item modal --- */
function ItemModal({ item, groups, currency, accent, canOrder, onClose, onAdd }) {
  const toast = useToast()
  const [qty, setQty] = useState(1)
  // selections: { [optionId]: valueId[] }  (single = array of length 0/1)
  const [selections, setSelections] = useState(() => {
    const init = {}
    for (const g of groups) {
      init[g.id] = g.is_required && g.selection_type === 'single' && g.values[0] ? [g.values[0].id] : []
    }
    return init
  })

  const toggle = (group, valueId) => {
    setSelections((sel) => {
      const cur = sel[group.id] || []
      if (group.selection_type === 'single') return { ...sel, [group.id]: [valueId] }
      return cur.includes(valueId)
        ? { ...sel, [group.id]: cur.filter((v) => v !== valueId) }
        : { ...sel, [group.id]: [...cur, valueId] }
    })
  }

  const chosen = useMemo(() => {
    const out = []
    for (const g of groups) {
      for (const vid of selections[g.id] || []) {
        const v = g.values.find((x) => x.id === vid)
        if (v) out.push({ group: g.name, value: v.name, priceDelta: Number(v.price_delta) })
      }
    }
    return out
  }, [groups, selections])

  const unitPrice = Number(item.price) + chosen.reduce((s, o) => s + o.priceDelta, 0)

  const add = () => {
    // Validate required groups.
    for (const g of groups) {
      if (g.is_required && (selections[g.id] || []).length === 0) {
        toast.error(`Please choose ${g.name}.`)
        return
      }
    }
    onAdd(makeLine(item, chosen, qty))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ '--brand': accent }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="relative">
          <div className="h-44 w-full overflow-hidden rounded-t-3xl bg-gray-100">
            {item.image_url ? (
              <img src={imageUrl(item.image_url)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-gray-300">
                <UtensilsCrossed className="h-10 w-10" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-700 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-2xl font-semibold text-stone-900">
            <DietMark diet={item.diet} />
            <span className="min-w-0">{item.name}</span>
          </h3>
          {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(item.price, currency)}</p>

          {groups.map((g) => (
            <div key={g.id} className="mt-5">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-bold text-gray-900">{g.name}</h4>
                <span className="text-xs text-gray-400">
                  {g.is_required ? 'Required' : 'Optional'} ·{' '}
                  {g.selection_type === 'single' ? 'choose one' : 'choose any'}
                </span>
              </div>
              <div className="space-y-2">
                {g.values.map((v) => {
                  const isSel = (selections[g.id] || []).includes(v.id)
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggle(g, v.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isSel ? 'border-brand bg-gray-50' : 'border-gray-200'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`grid h-5 w-5 place-items-center border ${
                            g.selection_type === 'single' ? 'rounded-full' : 'rounded-md'
                          } ${isSel ? 'border-brand bg-brand text-white' : 'border-gray-300'}`}
                        >
                          {isSel && <span className="h-2 w-2 rounded-sm bg-white" />}
                        </span>
                        <span className="font-medium text-gray-800">{v.name}</span>
                      </span>
                      {Number(v.price_delta) !== 0 && (
                        <span className="text-sm text-gray-500">
                          +{formatCurrency(v.price_delta, currency)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="border-t border-gray-100 px-5 py-4 safe-bottom">
          {canOrder ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-2 py-1.5">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-700 shadow-sm"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-5 text-center font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={add}
                className="flex flex-1 items-center justify-between rounded-xl px-5 py-3 font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                <span>Add to cart</span>
                <span>{formatCurrency(unitPrice * qty, currency)}</span>
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Scan a table’s QR code to order.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- cart sheet --- */
function CartSheet({ cart, setCart, currency, accent, taxRate, loyaltyMemberId, loyaltyEnabled, loyaltyName, onJoinLoyalty, isTruck, restaurantId, tableId, onClose, onPlaced }) {
  const toast = useToast()
  const [notes, setNotes] = useState('')
  const [orderType, setOrderType] = useState(isTruck ? 'takeout' : 'dine_in')
  const [customerName, setCustomerName] = useState(loyaltyName || '')
  const [placing, setPlacing] = useState(false)

  const subtotal = cart.reduce((s, l) => s + l.lineTotal, 0)
  const tax = Math.round(subtotal * taxRate) / 100
  const total = subtotal + tax

  const changeQty = (lineId, delta) => {
    setCart((c) =>
      c
        .map((l) =>
          l.lineId === lineId
            ? { ...l, quantity: l.quantity + delta, lineTotal: l.unitPrice * (l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    )
  }

  const placeOrder = async () => {
    if (cart.length === 0) return
    if (isTruck && !customerName.trim()) {
      toast.error('Please enter your name so we can call you.')
      return
    }
    setPlacing(true)
    const payload = cart.map((l) => ({
      menu_item_id: l.itemId,
      name_snapshot: l.name,
      unit_price: l.unitPrice,
      quantity: l.quantity,
      selected_options: l.options.map((o) => ({
        group: o.group,
        value: o.value,
        price_delta: o.priceDelta,
      })),
      line_total: l.lineTotal,
    }))
    const { error } = await supabase.rpc('place_order', {
      p_restaurant_id: restaurantId,
      p_table_id: tableId || null,
      p_items: payload,
      p_notes: notes.trim() || null,
      p_order_type: orderType,
      p_loyalty_member_id: loyaltyMemberId,
      p_customer_name: isTruck ? customerName.trim() : null,
    })
    setPlacing(false)
    if (error) {
      toast.error(error.message || 'Could not place order.')
      return
    }
    // TODO(payments): for trucks, redirect to Stripe payment here; the order is
    // created 'awaiting_payment' and only reaches the kitchen once paid.
    toast.success(isTruck ? 'Order placed — pay to send it to the kitchen.' : 'Order placed! 🎉')
    onPlaced()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ '--brand': accent }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-display text-xl font-semibold text-stone-900">Your order</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Your cart is empty.</p>
          ) : (
            <div className="space-y-3">
              {isTruck ? (
                /* Food truck: order by name, collected when called. */
                <div>
                  <label className="mb-1 block text-sm font-semibold text-stone-700">
                    Your name
                  </label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="We’ll call this when it’s ready"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              ) : (
                <>
                  {/* Dine-in / takeout choice */}
                  <div className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1">
                    {[
                      ['dine_in', 'Dine-in', UtensilsCrossed],
                      ['takeout', 'Takeout', ShoppingBag],
                    ].map(([key, label, Icon]) => (
                      <button
                        key={key}
                        onClick={() => setOrderType(key)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition ${
                          orderType === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                        }`}
                      >
                        <Icon className="h-4 w-4" style={orderType === key ? { color: accent } : undefined} />
                        {label}
                      </button>
                    ))}
                  </div>
                  {orderType === 'takeout' && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Packed to go — pick it up at the counter when it’s ready.
                    </p>
                  )}
                </>
              )}
              {loyaltyEnabled && !loyaltyMemberId && (
                <button
                  onClick={onJoinLoyalty}
                  className="flex w-full items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5 text-left text-xs font-semibold text-stone-700 transition active:scale-[.99]"
                >
                  <Star className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  Join rewards before ordering — this could be your visit #1
                </button>
              )}
              {cart.map((l) => (
                <div key={l.lineId} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{l.name}</p>
                    {l.options.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {l.options.map((o) => o.value).join(', ')}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {formatCurrency(l.unitPrice, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-1.5 py-1">
                    <button
                      onClick={() => changeQty(l.lineId, -1)}
                      className="grid h-7 w-7 place-items-center rounded-md bg-white text-gray-700 shadow-sm"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-4 text-center text-sm font-bold">{l.quantity}</span>
                    <button
                      onClick={() => changeQty(l.lineId, 1)}
                      className="grid h-7 w-7 place-items-center rounded-md bg-white text-gray-700 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-16 text-right font-bold text-gray-900">
                    {formatCurrency(l.lineTotal, currency)}
                  </span>
                </div>
              ))}

              <div className="pt-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add a note for the kitchen (allergies, no onions…)"
                  className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 safe-bottom">
            <div className="mb-3 space-y-1">
              {taxRate > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-700">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tax ({taxRate}%)</span>
                    <span className="font-semibold text-gray-700">
                      {formatCurrency(tax, currency)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total</span>
                <span className="text-xl font-extrabold text-gray-900">
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
            <button
              onClick={placeOrder}
              disabled={placing}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {placing ? 'Placing order…' : isTruck ? 'Continue to payment' : 'Place order'}
              {!placing && <ArrowRight className="h-5 w-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- screens -- */
function SessionErrorScreen({ error }) {
  return (
    <CenteredCard
      icon={AlertTriangle}
      title="Couldn’t start your session"
      text={
        /anonymous/i.test(error?.message || '')
          ? 'Anonymous ordering is disabled. The restaurant needs to enable “Anonymous sign-ins” in Supabase Auth settings.'
          : error?.message || 'Please try again.'
      }
    />
  )
}

function NotFoundScreen() {
  return <CenteredCard icon={Store} title="Restaurant not found" text="This link may be invalid or the restaurant is no longer available." />
}

function CenteredCard({ icon: Icon, title, text, inline }) {
  const body = (
    <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm">
      <div className="mx-auto mb-3 inline-flex rounded-2xl bg-gray-100 p-3 text-gray-400">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </div>
  )
  if (inline) return body
  return <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-5">{body}</div>
}

/* ----------------------------------------------------------- brand picker -- */
// Shown when a restaurant runs 2+ brands from one QR: guests choose a menu
// first, then can flip between brands from the tabs above the category nav.
function BrandPicker({ brands, categories, items, accent, onPick }) {
  const countFor = (brand) => {
    const ids = new Set(categories.filter((c) => c.brand === brand).map((c) => c.id))
    return items.filter((i) => ids.has(i.category_id)).length
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="text-center font-display text-2xl font-semibold text-stone-900">
        Choose a menu
      </h2>
      <p className="mt-1 text-center text-sm text-stone-500">
        Two kitchens, one table — you can switch any time.
      </p>
      <div className="mt-6 space-y-4">
        {brands.map((b) => (
          <button
            key={b}
            onClick={() => onPick(b)}
            className="relative w-full overflow-hidden rounded-3xl bg-stone-900 p-6 text-left text-white shadow-lg transition duration-200 hover:-translate-y-0.5 active:scale-[.99]"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(120% 90% at 85% -10%, ${accent}59, transparent 60%)`,
              }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-semibold">{b}</p>
                <p className="mt-1 text-sm text-white/60">{countFor(b)} items</p>
              </div>
              <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------- loyalty modal -- */
// Join / sign-in sheet for the rewards program. Membership is remembered on
// the device; visits only count when an order is actually placed.
function LoyaltyModal({ restaurant, accent, onClose, onJoined }) {
  const toast = useToast()
  const [mode, setMode] = useState('join') // 'join' | 'signin'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [member, setMember] = useState(null) // success state

  const submit = async () => {
    const em = email.trim().toLowerCase()
    if (!/.+@.+\..+/.test(em)) return toast.error('Enter a valid email address.')
    setBusy(true)
    try {
      if (mode === 'join') {
        if (!name.trim()) return toast.error('Enter your name.')
        if (!consent) return toast.error('Please agree to receive offers to join the program.')
        const { data, error } = await supabase.rpc('loyalty_join', {
          p_restaurant: restaurant.id,
          p_name: name.trim(),
          p_email: em,
          p_consent: consent,
        })
        if (error) return toast.error(error.message)
        setMember(data)
        onJoined(data)
      } else {
        const { data, error } = await supabase.rpc('loyalty_lookup', {
          p_restaurant: restaurant.id,
          p_email: em,
        })
        if (error) return toast.error(error.message)
        if (!data) return toast.error('No membership found for that email — join instead!')
        setMember(data)
        onJoined(data)
      }
    } finally {
      setBusy(false)
    }
  }

  const every = restaurant.loyalty_reward_every || 10
  const rewardText = restaurant.loyalty_reward || 'a free item'
  const remaining = member ? every - ((member.visits || 0) % every) : every
  const rewardNow = member && member.rewards_available > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ '--brand': accent }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        {/* header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-stone-900 px-6 pb-5 pt-6 text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(120% 90% at 85% -10%, ${accent}59, transparent 60%)` }}
          />
          <div className="relative">
            <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <Star className="h-5 w-5 text-amber-300" />
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold">
              {restaurant.loyalty_brand} Rewards
            </h3>
            <p className="mt-1 text-sm text-white/70">
              Earn {rewardText} every {every} visits. Visits count when you order.
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-white/60 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {member ? (
          <div className="px-6 py-6 text-center">
            <p className="font-display text-xl font-semibold text-stone-900">
              Welcome{member.name ? `, ${member.name.split(' ')[0]}` : ''}! ⭐
            </p>
            <p className="mt-1.5 text-sm text-stone-500">
              {rewardNow
                ? `You have ${member.rewards_available} reward${member.rewards_available === 1 ? '' : 's'} waiting — show this to your server!`
                : member.visits === 0
                  ? 'You’re in. Your visit counts once your first bill is paid.'
                  : `You’ve completed ${member.visits} ${member.visits === 1 ? 'visit' : 'visits'} — ${remaining} more to ${rewardText}.`}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${rewardNow ? 100 : ((member.visits % every) / every) * 100}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl py-3 font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              Start ordering
            </button>
          </div>
        ) : (
          <div className="px-6 py-5">
            {mode === 'join' && (
              <div className="mb-3">
                <label className="mb-1 block text-sm font-semibold text-stone-700">Your name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Priya Sharma"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                />
              </div>
            )}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-stone-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
              />
            </div>
            {mode === 'join' && (
              <label className="mb-4 flex items-start gap-2.5 text-xs text-stone-500">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300"
                />
                <span>
                  I agree to receive promotional emails and offers from {restaurant.name}. I can
                  unsubscribe anytime by contacting the restaurant.
                </span>
              </label>
            )}
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl py-3 font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {busy ? 'One moment…' : mode === 'join' ? 'Join the program' : 'Find my visits'}
            </button>
            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                onClick={() => setMode(mode === 'join' ? 'signin' : 'join')}
                className="font-semibold text-stone-700 hover:underline"
              >
                {mode === 'join' ? 'Already a member? Sign in' : 'New here? Join the program'}
              </button>
              <button onClick={onClose} className="text-stone-400 hover:underline">
                Maybe later
              </button>
            </div>
            <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-400">
              How it works: a visit counts when your bill is paid (one visit per sitting). Every{' '}
              {every} visits earns {rewardText}, chosen with the restaurant and redeemed in store.
              Visits are credited to the member who places the order.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
