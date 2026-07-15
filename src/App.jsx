import { Routes, Route, Navigate } from 'react-router-dom'
import { hasSupabaseConfig } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import { RequireOwner, RequireOnboarding, RequireAdmin } from './components/guards'
import SetupNotice from './pages/SetupNotice'

import Landing from './pages/Landing'
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Onboarding from './pages/Onboarding'

import DashboardLayout from './pages/dashboard/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import Menu from './pages/dashboard/Menu'
import Tables from './pages/dashboard/Tables'
import Orders from './pages/dashboard/Orders'
import FoodTruckBoard from './pages/dashboard/FoodTruckBoard'
import TruckQR from './pages/dashboard/TruckQR'
import Checkout from './pages/dashboard/Checkout'
import Loyalty from './pages/dashboard/Loyalty'
import Settings from './pages/dashboard/Settings'
import Kitchen from './pages/dashboard/Kitchen'

import Admin from './pages/admin/Admin'

import CustomerMenu from './pages/customer/CustomerMenu'
import CustomerStatus from './pages/customer/CustomerStatus'

// Food trucks get a streamlined name-based board; restaurants get the full
// orders board. Both live at /dashboard/orders.
function OrdersRoute() {
  const { restaurant } = useAuth()
  return restaurant?.business_type === 'food_truck' ? <FoodTruckBoard /> : <Orders />
}

export default function App() {
  // If env vars aren't set, show a friendly setup screen instead of a blank app.
  if (!hasSupabaseConfig) return <SetupNotice />

  return (
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
        <Route index element={<Overview />} />
        <Route path="menu" element={<Menu />} />
        <Route path="tables" element={<Tables />} />
        <Route path="qr" element={<TruckQR />} />
        <Route path="orders" element={<OrdersRoute />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="loyalty" element={<Loyalty />} />
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
  )
}
