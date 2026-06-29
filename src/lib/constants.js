// Order status flow: New -> Preparing -> Ready -> Served -> Completed
export const ORDER_STATUSES = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  preparing: { label: 'Preparing', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  ready: { label: 'Ready', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  served: { label: 'Served', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
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
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6',
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
