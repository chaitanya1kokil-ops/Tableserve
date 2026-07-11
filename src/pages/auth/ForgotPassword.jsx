import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Button, Field, Input } from '../../components/ui'
import AuthShell from './AuthShell'

export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) return toast.error(error.message)
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="Your reset link is on the way.">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <MailCheck className="h-8 w-8" />
          </div>
          <p className="text-sm text-gray-600">
            If an account exists for <strong>{email}</strong>, we sent a link to reset your
            password. The link expires after a short while, so use it soon.
          </p>
          <Link to="/login" className="mt-6 w-full">
            <Button className="w-full" size="lg">
              Back to login
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
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
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@restaurant.com"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  )
}
