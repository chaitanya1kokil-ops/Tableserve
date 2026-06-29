# 🍽️ TableServe

A multi-tenant, mobile-first **QR ordering platform** for restaurants — built with **React, Tailwind CSS, and Supabase**.

One platform, many independent restaurants. Each restaurant manages its own menu, tables, and orders in complete isolation (enforced by Postgres Row-Level Security). Customers scan a table's QR code and order in under a minute — no app, no login.

---

## ✨ Features

**Platform Admin**
- See every restaurant, approve/suspend them, view platform-wide stats.

**Restaurant Owner / Staff**
- Email/password sign-up + guided onboarding to create a restaurant profile.
- **Menu management** — categories, items (name, description, price, photo, availability), and modifiers/options (size, extras, spice level) with price deltas.
- **Tables & QR codes** — bulk-create tables, auto-generate a unique QR per table, download as PNG or print (single or all).
- **Live orders board** — orders stream in by table in real time; advance them `New → Preparing → Ready → Served → Completed`.
- **Sales overview** — today's orders, revenue, average order value, popular items.
- **Branding** — your logo + accent color appear across your customer menu.

**Customer (no login)**
- Scans a table QR → lands on that restaurant's branded menu for that table.
- Browse by category, view photos, pick modifiers, build a cart, place an order.
- Live order status (`Received → Preparing → Ready → Served`), add more items, request the bill.

---

## 🧱 Tech stack

| | |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (mobile-first) |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Isolation | Postgres Row-Level Security (RLS) |
| QR codes | `qrcode.react` |
| Icons | `lucide-react` |

---

## 🚀 Setup

### Prerequisites
- **Node.js 18+** and npm.
- A free **Supabase** project — <https://supabase.com>.

### 1. Install dependencies
```bash
npm install
```

### 2. Create the database
In the Supabase dashboard → **SQL Editor**, paste and run the contents of:
```
supabase/migrations/0001_initial_schema.sql
```
This creates all tables, RLS policies, helper functions, the order-placement RPC, realtime publication, and the storage bucket.

> Using the Supabase CLI instead? `supabase db push` will apply the migration.

### 3. Enable anonymous customer ordering
Customers order without an account via Supabase **Anonymous sign-ins**:
- Dashboard → **Authentication → Sign In / Providers** (or **Settings**) → enable **Anonymous sign-ins**.

(Optional, for the smoothest owner sign-up during local testing: **Authentication → Providers → Email** → turn **off** "Confirm email". Otherwise owners must confirm via email before logging in — the app handles both.)

### 4. Configure environment variables
Copy the example and fill in your project's values from **Project Settings → API**:
```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 5. Run the app
```bash
npm run dev
```
Open the printed URL (default <http://localhost:5173>). The dev server also binds to your LAN, so you can scan QR codes from a phone on the same network — replace `localhost` with your computer's IP in the QR URL, or set the QR origin accordingly.

---

## 👤 First run walkthrough

1. **Sign up** as a restaurant owner at `/signup` → complete onboarding (name, cuisine, logo, accent color).
2. **Add a category** (e.g. *Mains*) → **add menu items** with photos and options.
3. **Create tables** under *Tables* → download/print the QR codes.
4. **Scan a QR** (or open `/r/{restaurantId}/t/{tableId}`) on your phone → place an order.
5. Watch it appear instantly on the **Orders** board → advance the status and see it update live on the customer's phone.

### Become a platform admin
There's intentionally no self-serve way to grant admin (security). Promote yourself via SQL:
```sql
update public.profiles set role = 'platform_admin' where email = 'you@example.com';
```
Then log in and visit `/admin`.

---

## 🔐 Multi-tenancy & security model

Every tenant-owned row carries a `restaurant_id`. RLS scopes all access:

- **Owners/staff** can only read/write rows where `restaurant_id = current_restaurant_id()` (resolved from their profile via a `SECURITY DEFINER` helper, which avoids policy recursion).
- **Customers** are anonymous authenticated users. They can:
  - read **active** restaurants' menus/tables (public read),
  - insert orders where `customer_id = auth.uid()`,
  - read **only their own** orders (so realtime status updates are private).
- **Platform admins** bypass tenant scoping via `is_platform_admin()`.
- **Storage**: a public `restaurant-images` bucket; writes are restricted so a tenant can only upload under their own `{restaurant_id}/…` folder.
- **Order placement** goes through the `place_order` RPC (runs with the caller's RLS) so the order + its line items are inserted atomically.

Realtime is powered by the `supabase_realtime` publication on `orders` and `order_items`; because RLS applies to realtime, each party only receives the rows they're allowed to see.

---

## 🗂️ Project structure

```
supabase/migrations/      SQL schema + RLS + RPCs
src/
  lib/                    supabase client, constants, formatters
  context/AuthContext     session + profile + restaurant
  hooks/                  useCustomerSession (anonymous sign-in)
  components/             UI kit, Toast, ImageUpload, route guards
  pages/
    Landing, SetupNotice, Onboarding
    auth/                 Login, Signup
    dashboard/            DashboardLayout, Overview, Menu, Tables, Orders, Settings
    admin/                Admin
    customer/             CustomerMenu, CustomerStatus
```

---

## 📝 Data model

`profiles` · `restaurants` · `menu_categories` · `menu_items` · `item_options` · `item_option_values` · `tables` · `orders` · `order_items`

Modifiers are normalized into option **groups** (`item_options`) and **choices** (`item_option_values`). Each order line snapshots the item name, unit price, and chosen options as JSON, so editing the menu later never alters historical orders.

---

## ⚠️ Notes & possible next steps

- **Order totals are computed client-side** and trusted by `place_order` (there is no payment step). For production, recompute prices server-side from the menu inside the RPC.
- No payment processing — orders are placed and tracked, not charged.
- "Request bill" flags the customer's open orders for staff; it doesn't close them automatically.
- Drag-to-reorder for categories/items isn't included (uses `sort_order`); add it if you need manual ordering.
- Consider adding push/sound notifications on the orders board for busy kitchens.
