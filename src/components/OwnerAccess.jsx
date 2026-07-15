import { useState } from 'react'
import { Lock, X, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { Button } from './ui'

// PIN entry to unlock owner mode (revenue, analytics, reporting).
export function OwnerPinModal({ onClose }) {
  const { unlockOwner } = useAuth()
  const toast = useToast()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!/^\d{4,6}$/.test(pin)) return toast.error('Enter your 4–6 digit PIN.')
    setBusy(true)
    const ok = await unlockOwner(pin)
    setBusy(false)
    if (!ok) return toast.error('Incorrect PIN.')
    toast.success('Owner mode unlocked 🔓')
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
        <span className="mx-auto inline-grid h-12 w-12 place-items-center rounded-2xl bg-stone-900 text-amber-300">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h3 className="mt-3 font-display text-xl font-semibold text-stone-900">Owner access</h3>
        <p className="mt-1 text-sm text-stone-500">
          Enter your PIN to view revenue, analytics and reporting.
        </p>
        <form onSubmit={submit} className="mt-5">
          <input
            autoFocus
            inputMode="numeric"
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-stone-900"
          />
          <Button type="submit" className="mt-4 w-full" size="lg" loading={busy}>
            Unlock
          </Button>
        </form>
      </div>
    </div>
  )
}

// Wrap owner-only content. Staff see a lock screen with a PIN prompt.
export function OwnerOnly({ children }) {
  const { isOwner } = useAuth()
  const [pinOpen, setPinOpen] = useState(false)
  if (isOwner) return children
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div className="max-w-sm">
        <span className="mx-auto inline-grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-stone-400">
          <Lock className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-stone-900">Owner only</h2>
        <p className="mt-1.5 text-sm text-stone-500">
          Revenue and analytics are visible in owner mode. Enter the owner PIN to continue.
        </p>
        <Button className="mt-5" size="lg" onClick={() => setPinOpen(true)}>
          <ShieldCheck className="h-4 w-4" /> Enter owner PIN
        </Button>
      </div>
      {pinOpen && <OwnerPinModal onClose={() => setPinOpen(false)} />}
    </div>
  )
}
