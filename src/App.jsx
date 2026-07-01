import { Routes, Route, Navigate } from 'react-router-dom'
import { hasSupabaseConfig } from './lib/supabase'
import { RequireOwner, RequireOnboarding, RequireAdmin } from './components/guards'
import SetupNotice from './pages/SetupNotice'

import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Onboarding from './pages/Onboarding'

import DashboardLayout from './pages/dashboard/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import Menu from './pages/dashboard/Menu'
import Tables from './pages/dashboard/Tables'
import Orders from './pages/dashboard/Orders'
import Settings from './pages/dashboard/Settings'
import Kitchen from './pages/dashboard/Kitchen'

import Admin from './pages/admin/Admin'

import CustomerMenu from './pages/customer/CustomerMenu'
import CustomerStatus from './pages/customer/CustomerStatus'

export default function App() {
  // If env vars aren't set, show a friendly setup screen instead of a blank app.
  if (!hasSupabaseConfig) return <SetupNotice />

  return (
    <Routes>
      {/* Public marketing + auth */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

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
        <Route path="orders" element={<Orders />} />
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
      {/* Browse-only (no table) — e.g. someone visits without scanning */}
      <Route path="/r/:restaurantId" element={<CustomerMenu />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
