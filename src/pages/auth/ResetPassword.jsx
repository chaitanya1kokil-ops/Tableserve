import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Button, Field, Input, FullPageSpinner } from '../../components/ui'
import AuthShell from './AuthShell'

// Landing page for the password-recovery email link. Supabase signs the user
// in with a temporary recovery session; we then let them set a new password.
export default function ResetPassword() {
  const toast = useToast()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // The recovery token in the URL is processed asynchronously, so listen for
    // the session as well as checking for one that already exists.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true)
        setChecking(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return toast.error('Passwords do not match.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated. You are logged in.')
    navigate('/dashboard', { replace: true })
  }

  if (checking) return <FullPageSpinner label="Checking your reset link…" />

  if (!hasSession) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="This reset link is invalid or has already been used."
      >
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Reset links only work once and expire quickly. Request a fresh one and try again.
          </p>
          <Link to="/forgot-password" className="mt-6 block">
            <Button className="w-full" size="lg">
              Request a new link
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose something memorable and secure.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="New password" required hint="At least 6 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            required
            autoFocus
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm new password" required>
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={saving}>
          <KeyRound className="h-4 w-4" /> Update password
        </Button>
      </form>
    </AuthShell>
  )
}
