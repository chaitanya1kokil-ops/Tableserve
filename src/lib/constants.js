// Order status flow: New -> Preparing -> Ready -> Served -> Completed
// Each status carries the full color treatment used across the app:
// `color` chip, `dot`, `bar` (card top strip) and `btn` (advance-action button).
export const ORDER_STATUSES = {
  awaiting_payment: {
    label: 'Awaiting payment',
    color: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
    bar: 'bg-orange-400',
    btn: 'bg-orange-600 hover:bg-orange-700',
  },
  new: {
    label: 'New',
    color: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    bar: 'bg-amber-400',
    btn: 'bg-amber-500 hover:bg-amber-600',
  },
  ready: {
    label: 'Ready',
    color: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
  },
  served: {
    label: 'Served',
    color: 'bg-stone-200 text-stone-600',
    dot: 'bg-stone-400',
    bar: 'bg-stone-300',
    btn: 'bg-stone-700 hover:bg-stone-800',
  },
  completed: {
    label: 'Completed',
    color: 'bg-teal-50 text-teal-700',
    dot: 'bg-teal-500',
    bar: 'bg-teal-400',
    btn: 'bg-teal-600 hover:bg-teal-700',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    bar: 'bg-red-400',
    btn: 'bg-red-600 hover:bg-red-700',
  },
}

// Ordered list used for the staff "advance status" button.
export const STATUS_ORDER = ['new', 'preparing', 'ready', 'served', 'completed']

// The next status when staff press "advance", or null at the end.
export function nextStatus(status) {
  const i = STATUS_ORDER.indexOf(status)
  if (i === -1 || i >= STATUS_ORDER.length - 1) return null
  return STATUS_ORDER[i + 1]
}

// Statuses the customer sees as "live" progress on their order.
export const CUSTOMER_STATUS_STEPS = ['new', 'preparing', 'ready', 'served']

export const RESTAURANT_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700' },
}

export const CUISINES = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai',
  'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Greek', 'Spanish',
  'Middle Eastern', 'BBQ', 'Seafood', 'Vegetarian', 'Cafe', 'Bakery', 'Other',
]

export const ACCENT_PRESETS = [
  '#b45309', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#0f172a',
]

export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY',
  'AED', 'SGD', 'MXN', 'BRL', 'ZAR', 'NGN', 'KES',
]

export const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

// ---------------------------------------------------------------------------
// Subscription plans — single source of truth for pricing AND feature gates.
// Kept in sync with the DB (0016_plan_limits.sql) and the landing page.
// Trial unlocks everything so new signups experience the full product.
// ---------------------------------------------------------------------------
export const PLANS = {
  trial:      { label: 'Trial',      price: 0,   color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',      maxTables: null, loyalty: true,  multiBrand: true },
  starter:    { label: 'Starter',    price: 99,  color: 'bg-stone-200 text-stone-700',     dot: 'bg-stone-500',     maxTables: 10,   loyalty: false, multiBrand: false },
  pro:        { label: 'Pro',        price: 179, color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',     maxTables: 40,   loyalty: true,  multiBrand: true },
  premium:    { label: 'Premium',    price: 299, color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500',    maxTables: null, loyalty: true,  multiBrand: true },
  // Flat plan for food trucks — one QR, order-by-name, online payments, loyalty.
  food_truck: { label: 'Food Truck', price: 79,  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500',   maxTables: null, loyalty: true,  multiBrand: false },
}

// Detailed feature lists shown on plan cards (onboarding + Subscription tab).
// Higher tiers reference the one below with "Everything in …".
export const PLAN_FEATURES = {
  starter: [
    'Up to 10 tables',
    'QR menu — dine-in, takeout & counter',
    'Kitchen display + auto-print tickets',
    'Live orders board & server calls',
    'Menu, modifiers & category ordering',
    'Online payment links & Google reviews',
    'Card payments — 0% commission',
  ],
  pro: [
    'Everything in Starter',
    'Up to 40 tables',
    'Loyalty & rewards program',
    'Multiple brands with logos',
    'Full analytics — peak hours & best-sellers',
    'Owner & staff PIN roles',
  ],
  premium: [
    'Everything in Pro',
    'Unlimited tables & locations',
    'Priority support',
    'Personalised onboarding',
  ],
  food_truck: [
    'Single QR — order by name',
    'Online payments (Stripe) & 0% commission',
    'Loyalty & rewards program',
    'Kitchen display + auto-print tickets',
    'Live orders board & one-tap ready',
    'Analytics & best-sellers',
  ],
}

const planFor = (r) => PLANS[r?.plan] || PLANS.trial

// Food trucks always get loyalty (their $79 plan includes it — trucks live on
// repeat customers); otherwise it follows the plan.
export const allowsLoyalty = (r) => planFor(r).loyalty || r?.business_type === 'food_truck'
export const allowsMultiBrand = (r) => planFor(r).multiBrand
export const tableLimit = (r) => planFor(r).maxTables // null = unlimited
