import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  Settings as SettingsIcon,
  Wallet,
  Star,
  LogOut,
  Store,
  AlertTriangle,
  ChefHat,
  BarChart3,
  CreditCard,
  Loader2,
  Bell,
  X,
  ShieldCheck,
  Lock,
  MoreHorizontal,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { OwnerPinModal } from '../../components/OwnerAccess'
import { imageUrl } from '../../lib/supabase'
import { RESTAURANT_STATUS } from '../../lib/constants'
import { useServerCalls } from '../../hooks/useServerCalls'
import { useOrderSounds } from '../../hooks/useOrderSounds'
import { useNewOrderCount } from '../../hooks/useNewOrderCount'
import Logo from '../../components/Logo'

// `restaurantOnly` items are hidden for food trucks (they pay online, have no
// tables, and use a single combined orders board instead of a kitchen display).
// `ownerOnly` items (revenue/analytics) are hidden in staff mode.
// `mobilePrimary` items get a slot in the phone bottom bar; everything else is
// reachable on phones via the "More" sheet (iPad+ shows all items in the
// sidebar). This keeps full feature parity on iPhone without overflowing the bar.
const NAV = [
  { to: '/dashboard', end: true, label: 'Overview', icon: LayoutDashboard, ownerOnly: true, mobilePrimary: true },
  { to: '/dashboard/orders', label: 'Orders', icon: ClipboardList, mobilePrimary: true },
  { to: '/dashboard/floor', label: 'Floor plan', icon: LayoutGrid, restaurantOnly: true },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, ownerOnly: true },
  { to: '/dashboard/checkout', label: 'Checkout', icon: Wallet, restaurantOnly: true },
  { to: '/kitchen', label: 'Kitchen', icon: ChefHat, mobilePrimary: true },
  { to: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed, mobilePrimary: true },
  { to: '/dashboard/qr', label: 'QR code', icon: QrCode, truckOnly: true },
  { to: '/dashboard/loyalty', label: 'Loyalty', icon: Star, ownerOnly: true },
  { to: '/dashboard/tables', label: 'Tables', icon: QrCode, restaurantOnly: true },
  { to: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, ownerOnly: true },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
]

export default function DashboardLayout() {
  const { restaurant, signOut } = useAuth()
  const status = RESTAURANT_STATUS[restaurant?.status] || RESTAURANT_STATUS.active
  const { calls, resolve, muted, toggleMute } = useServerCalls(restaurant?.id)
  const { soundReady, enableSound } = useOrderSounds(restaurant?.id, muted)
  const newOrders = useNewOrderCount(restaurant?.id)

  const { isOwner, ownerPinSet, ownerMode, lockOwner } = useAuth()
  const [pinOpen, setPinOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()

  const isTruck = restaurant?.business_type === 'food_truck'
  const nav = NAV.filter(
    (item) =>
      !(isTruck && item.restaurantOnly) &&
      !(!isTruck && item.truckOnly) &&
      !(!isOwner && item.ownerOnly),
  )

  // Phone bottom bar = primary tabs + a "More" sheet holding the rest, so every
  // page stays reachable on iPhone (iPad+ uses the full sidebar above).
  const mobilePrimary = nav.filter((item) => item.mobilePrimary)
  const mobileMore = nav.filter((item) => !item.mobilePrimary)
  const moreActive = mobileMore.some((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  )

  // The floor plan wants the whole width — hide the sidebar and use the bottom
  // bar for nav (like a phone) at every size, and let the canvas go full-bleed.
  const isFloor = pathname === '/dashboard/floor'

  // New restaurants stay 'pending' until Stripe Checkout completes. Block the
  // dashboard so payment can't be skipped by hitting Back from Stripe.
  if (restaurant?.status === 'pending') return <SubscriptionGate />

  return (
    <div
      className="min-h-[100dvh] bg-[#faf6ef]"
      style={{ '--brand': restaurant?.accent_color || '#b45309' }}
    >
      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (all sizes — nav lives in the bottom bar) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            {restaurant?.logo_url ? (
              <img src={imageUrl(restaurant.logo_url)} alt="" className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white">
                <Store className="h-4 w-4" />
              </span>
            )}
            <span className="line-clamp-1">{restaurant?.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {ownerPinSet &&
              (ownerMode ? (
                <button
                  onClick={lockOwner}
                  className="rounded-lg bg-stone-900 p-2 text-amber-300"
                  title="Owner mode — tap to exit"
                >
                  <ShieldCheck className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => setPinOpen(true)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  title="Switch to owner"
                >
                  <Lock className="h-5 w-5" />
                </button>
              ))}
            <button onClick={signOut} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {!soundReady && !muted && (
          <button
            onClick={enableSound}
            className="flex w-full items-center justify-center gap-2 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            <Bell className="h-4 w-4 text-amber-300" />
            Tap once to turn on order sounds
          </button>
        )}

        {calls.length > 0 && (
          <div className="z-20 border-b border-orange-200 bg-orange-50 md:sticky md:top-0">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:px-8">
              <span className="flex flex-shrink-0 items-center gap-2 text-sm font-semibold text-orange-800">
                <Bell className="h-5 w-5 animate-bounce text-orange-500" />
                <span className="hidden sm:inline">
                  {calls.length === 1 ? '1 table needs a server' : `${calls.length} tables need a server`}
                </span>
              </span>
              {/* Chips scroll horizontally, so the bar stays one line no matter how many. */}
              <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                {calls.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => resolve(c)}
                    title="Tap to resolve"
                    className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-orange-300 bg-white py-1 pl-3 pr-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                  >
                    {c.table?.label || 'Table'}
                    <X className="h-4 w-4 text-orange-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {restaurant?.status !== 'active' && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Your restaurant is <strong>{status.label.toLowerCase()}</strong>. Customers can’t place
            orders until it’s active.
          </div>
        )}

        <main className="flex-1 px-4 pb-24 pt-5 md:px-8">
          <div className={isFloor ? '' : 'mx-auto max-w-5xl'}>
            <Outlet context={{ muted, toggleMute }} />
          </div>
        </main>
      </div>

      {/* Bottom nav — the app's primary navigation at every size */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-100 bg-white/95 backdrop-blur safe-bottom">
        {mobilePrimary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-brand' : 'text-gray-400'
              }`
            }
          >
            <span className="relative">
              <item.icon className="h-5 w-5" />
              {item.to === '/dashboard/orders' && newOrders > 0 && (
                <span className="absolute -right-2 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {newOrders}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
        {mobileMore.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              moreActive ? 'text-brand' : 'text-gray-400'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        )}
      </nav>

      {/* "More" sheet — every remaining tab, so iPhone has full parity */}
      {moreOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="grid grid-cols-4 gap-2">
              {mobileMore.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-medium ${
                      isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {pinOpen && <OwnerPinModal onClose={() => setPinOpen(false)} />}
    </div>
  )
}

function SideLink({ item, badge = 0 }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'bg-brand text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <item.icon className="h-5 w-5" />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-white px-1 text-xs font-bold text-brand shadow-sm ring-1 ring-black/5">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

// Shown when a restaurant is still 'pending' (hasn't completed Checkout). Lets
// the owner resume payment; auto-refreshes so it clears the moment the Stripe
// webhook marks them active after a successful trial signup.
function SubscriptionGate() {
  const { restaurant, user, signOut, refreshRestaurant } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setInterval(() => refreshRestaurant(), 4000)
    return () => clearInterval(t)
  }, [refreshRestaurant])

  async function resume() {
    setBusy(true)
    try {
      const resp = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          plan: restaurant.plan,
          interval: restaurant.billing_interval || 'month',
          email: user?.email,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (data?.url) {
        window.location.href = data.url
        return
      }
      throw new Error(data?.error || 'Could not start checkout.')
    } catch (e) {
      toast.error(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#faf6ef] px-5">
      <div className="w-full max-w-md rounded-3xl border border-stone-100 bg-white p-7 text-center shadow-sm">
        <Logo className="mx-auto h-10 w-10" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900">One last step</h1>
        <p className="mt-2 text-sm text-stone-500">
          Add a payment method to activate <strong className="text-stone-700">{restaurant?.name}</strong>{' '}
          and start your <strong className="text-stone-700">14-day free trial</strong>. You won’t be
          charged until the trial ends, and you can cancel anytime.
        </p>
        <button
          onClick={resume}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Add payment &amp; start free trial
        </button>
        <p className="mt-3 text-xs text-stone-400">
          Just completed payment? This updates automatically in a few seconds.
        </p>
        <button onClick={signOut} className="mt-4 text-sm font-medium text-stone-500 hover:text-stone-800">
          Sign out
        </button>
      </div>
    </div>
  )
}

function RestaurantBadge({ restaurant }) {
  return (
    <Link
      to="/dashboard/settings"
      className="mx-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3 hover:bg-gray-100"
    >
      {restaurant?.logo_url ? (
        <img src={imageUrl(restaurant.logo_url)} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <span
          className="grid h-10 w-10 place-items-center rounded-lg text-white"
          style={{ backgroundColor: restaurant?.accent_color || '#b45309' }}
        >
          <Store className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">{restaurant?.name}</p>
        <p className="truncate text-xs text-gray-500">{restaurant?.cuisine}</p>
      </div>
    </Link>
  )
}
