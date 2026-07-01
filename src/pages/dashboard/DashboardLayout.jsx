import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  Settings as SettingsIcon,
  LogOut,
  Store,
  AlertTriangle,
  ChefHat,
  Bell,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { imageUrl } from '../../lib/supabase'
import { RESTAURANT_STATUS } from '../../lib/constants'
import { useServerCalls } from '../../hooks/useServerCalls'
import { useNewOrderCount } from '../../hooks/useNewOrderCount'

const NAV = [
  { to: '/dashboard', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/dashboard/orders', label: 'Orders', icon: ClipboardList },
  { to: '/kitchen', label: 'Kitchen', icon: ChefHat },
  { to: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/dashboard/tables', label: 'Tables', icon: QrCode },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
]

export default function DashboardLayout() {
  const { restaurant, profile, signOut } = useAuth()
  const status = RESTAURANT_STATUS[restaurant?.status] || RESTAURANT_STATUS.active
  const { calls, resolve, muted, toggleMute } = useServerCalls(restaurant?.id)
  const newOrders = useNewOrderCount(restaurant?.id)

  return (
    <div className="min-h-[100dvh] bg-gray-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-extrabold text-gray-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <Store className="h-5 w-5" />
          </span>
          TableServe
        </div>

        <RestaurantBadge restaurant={restaurant} />

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <SideLink
              key={item.to}
              item={item}
              badge={item.to === '/dashboard/orders' ? newOrders : 0}
            />
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="px-2 py-1.5 text-xs text-gray-500">
            {profile?.full_name || profile?.email}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
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
          <button onClick={signOut} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {calls.length > 0 && (
          <div className="z-20 border-b border-orange-200 bg-orange-50 lg:sticky lg:top-0">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 lg:px-8">
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

        <main className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-5xl">
            <Outlet context={{ muted, toggleMute }} />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-100 bg-white/95 backdrop-blur safe-bottom lg:hidden">
        {NAV.map((item) => (
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
      </nav>
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
          style={{ backgroundColor: restaurant?.accent_color || '#ef4444' }}
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
