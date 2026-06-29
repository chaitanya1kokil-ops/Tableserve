import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Button, Field, Input } from '../../components/ui'
import AuthShell from './AuthShell'

export default function Signup() {
  const { signUp } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { data, error } = await signUp(form)
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    // If email confirmation is on, there's no session yet.
    if (data.session) {
      navigate('/onboarding', { replace: true })
    } else {
      setNeedsConfirm(true)
    }
  }

  if (needsConfirm) {
    return (
      <AuthShell title="Check your inbox" subtitle="One quick step to go.">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <MailCheck className="h-8 w-8" />
          </div>
          <p className="text-sm text-gray-600">
            We sent a confirmation link to <strong>{form.email}</strong>. Confirm your email,
            then log in to set up your restaurant.
          </p>
          <Link to="/login" className="mt-6 w-full">
            <Button className="w-full" size="lg">
              Go to login
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start taking orders in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Your name" required>
          <Input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Alex Chef"
          />
        </Field>
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
        <Field label="Password" required hint="At least 6 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
