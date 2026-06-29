import { Loader2 } from 'lucide-react'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/* ---------------------------------------------------------------- Button -- */
const BUTTON_VARIANTS = {
  primary: 'bg-brand text-white hover:opacity-90 shadow-sm',
  dark: 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  outline: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  'danger-outline': 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}

const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

/* --------------------------------------------------------------- Inputs --- */
export function Field({ label, hint, error, required, children, className }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50'

export function Input({ className, ...props }) {
  return <input className={cx(inputBase, className)} {...props} />
}

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cx(inputBase, 'resize-none', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(inputBase, 'appearance-none bg-no-repeat pr-10', className)} {...props}>
      {children}
    </select>
  )
}

/* ----------------------------------------------------------------- Card --- */
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cx('rounded-2xl border border-gray-100 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------- Badge --- */
export function Badge({ className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* --------------------------------------------------------------- Spinner -- */
export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-gray-400', className)} />
}

export function FullPageSpinner({ label }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

/* --------------------------------------------------------------- Toggle --- */
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition',
        checked ? 'bg-emerald-500' : 'bg-gray-300',
      )}
      aria-label={label}
    >
      <span
        className={cx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

/* ---------------------------------------------------------------- Modal --- */
export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cx(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-xl animate-slide-up sm:rounded-3xl',
          maxWidth,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 px-5 py-4 safe-bottom">{footer}</div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- EmptyState --- */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 rounded-2xl bg-gray-100 p-3 text-gray-400">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
