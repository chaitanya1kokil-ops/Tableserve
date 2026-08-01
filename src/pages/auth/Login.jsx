import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Button, Field, Input } from '../../components/ui'
import AuthShell from './AuthShell'
import { checkAttempt, recordFailure, clearAttempts, describeWait } from '../../lib/throttle'

export default function Login() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [lockedMs, setLockedMs] = useState(0)

  // Tick the countdown while this address is locked out.
  useEffect(() => {
    const tick = () => setLockedMs(checkAttempt(form.email).remainingMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [form.email])

  const onSubmit = async (e) => {
    e.preventDefault()
    const gate = checkAttempt(form.email)
    if (gate.blocked) {
      setLockedMs(gate.remainingMs)
      return
    }

    setLoading(true)
    const { error } = await signIn(form)
    setLoading(false)

    if (error) {
      const after = recordFailure(form.email)
      setLockedMs(after.remainingMs)
      if (after.blocked) {
        toast.error(`Too many attempts. Try again in ${describeWait(after.remainingMs)}.`)
      } else {
        toast.error(error.message)
      }
      return
    }

    clearAttempts(form.email)
    const to = location.state?.from?.pathname || '/dashboard'
    navigate(to, { replace: true })
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your restaurant."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@restaurant.com"
          />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </Field>
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-gray-500 hover:text-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {lockedMs > 0 && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800">
            Too many failed attempts for this address. Try again in{' '}
            {describeWait(lockedMs)}, or reset your password.
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={lockedMs > 0}
        >
          {lockedMs > 0 ? `Locked · ${describeWait(lockedMs)}` : 'Log in'}
        </Button>
      </form>
    </AuthShell>
  )
}
