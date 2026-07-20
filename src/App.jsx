import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { hasSupabaseConfig } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import { RequireOwner, RequireOnboarding, RequireAdmin } from './components/guards'
import { OwnerOnly } from './components/OwnerAccess'
import { FullPageSpinner } from './components/ui'
import SetupNotice from './pages/SetupNotice'

// Route components are lazy-loaded so each area ships its own chunk — a customer
// scanning a QR downloads only the menu, not the whole dashboard.
const Landing = lazy(() => import('./pages/Landing'))
const Terms = lazy(() => import('./pages/legal/Terms'))
const Privacy = lazy(() => import('./pages/legal/Privacy'))
const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const Overview = lazy(() => import('./pages/dashboard/Overview'))
const Analytics = lazy(() => import('./pages/dashboard/Analytics'))
const Subscription = lazy(() => import('./pages/dashboard/Subscription'))
const Menu = lazy(() => import('./pages/dashboard/Menu'))
const Tables = lazy(() => import('./pages/dashboard/Tables'))
const Orders = lazy(() => import('./pages/dashboard/Orders'))
const FoodTruckBoard = lazy(() => import('./pages/dashboard/FoodTruckBoard'))
const TruckQR = lazy(() => import('./pages/dashboard/TruckQR'))
const Checkout = lazy(() => import('./pages/dashboard/Checkout'))
const Loyalty = lazy(() => import('./pages/dashboard/Loyalty'))
const Settings = lazy(() => import('./pages/dashboard/Settings'))
const Kitchen = lazy(() => import('./pages/dashboard/Kitchen'))

const Admin = lazy(() => import('./pages/admin/Admin'))

const CustomerMenu = lazy(() => import('./pages/customer/CustomerMenu'))
const CustomerStatus = lazy(() => import('./pages/customer/CustomerStatus'))

// Food trucks get a streamlined name-based board; restaurants get the full
// orders board. Both live at /dashboard/orders.
function OrdersRoute() {
  const { restaurant } = useAuth()
  return restaurant?.business_type === 'food_truck' ? <FoodTruckBoard /> : <Orders />
}

// The dashboard home shows revenue/analytics (owner only). Staff land on Orders.
function DashboardHome() {
  const { isOwner } = useAuth()
  return isOwner ? <Overview /> : <Navigate to="/dashboard/orders" replace />
}

export default function App() {
  // If env vars aren't set, show a friendly setup screen instead of a blank app.
  if (!hasSupabaseConfig) return <SetupNotice />

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public marketing + auth */}
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Restaurant onboarding */}
        <Route
          path="/onboarding"
          element={
            <RequireOnboarding>
              <Onboarding />
            </RequireOnboarding>
          }
        />

        {/* Restaurant dashboard */}
        <Route
          path="/dashboard"
          element={
            <RequireOwner>
              <DashboardLayout />
            </RequireOwner>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="menu" element={<Menu />} />
          <Route path="tables" element={<Tables />} />
          <Route path="qr" element={<TruckQR />} />
          <Route path="orders" element={<OrdersRoute />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="analytics" element={<OwnerOnly><Analytics /></OwnerOnly>} />
          <Route path="subscription" element={<OwnerOnly><Subscription /></OwnerOnly>} />
          <Route path="loyalty" element={<OwnerOnly><Loyalty /></OwnerOnly>} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Full-screen kitchen display (owner/staff only) */}
        <Route
          path="/kitchen"
          element={
            <RequireOwner>
              <Kitchen />
            </RequireOwner>
          }
        />

        {/* Platform admin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        {/* Public customer ordering (reached by scanning a table QR code) */}
        <Route path="/r/:restaurantId/t/:tableId" element={<CustomerMenu />} />
        <Route path="/r/:restaurantId/t/:tableId/status" element={<CustomerStatus />} />
        {/* Food-truck ordering + status (one QR, no table) */}
        <Route path="/r/:restaurantId/status" element={<CustomerStatus />} />
        {/* Truck QR, or browse-only for a restaurant visited without a table */}
        <Route path="/r/:restaurantId" element={<CustomerMenu />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
