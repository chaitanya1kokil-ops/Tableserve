import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, CheckCircle2, MessageSquare } from 'lucide-react'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui'

const MAX = 4000

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const messageOk = message.trim().length > 0
  const canSend = emailOk && messageOk && !sending

  const submit = async (e) => {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('contact_messages').insert({
      name: name.trim() || null,
      email: email.trim(),
      message: message.trim(),
    })
    setSending(false)
    if (err) {
      setError(
        /Too many messages/.test(err.message)
          ? 'You’ve sent a few already — give it an hour and try again.'
          : 'That didn’t send. Please try again, or email us directly.',
      )
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-[100dvh] bg-white text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2 font-extrabold">
            <Logo className="h-8 w-8" />
            TableServe
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-stone-500">
            <Link to="/login" className="hover:text-stone-900">Log in</Link>
            <Link to="/signup" className="font-semibold text-brand">Sign up</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        {sent ? (
          <div className="rounded-3xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-100">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 font-display text-3xl font-semibold text-stone-900">
              Message received
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-stone-600">
              Thanks — we’ll reply to <span className="font-semibold">{email.trim()}</span>, usually
              within one business day.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/">
                <Button variant="outline">Back to home</Button>
              </Link>
              <button
                onClick={() => {
                  setSent(false)
                  setMessage('')
                }}
                className="text-sm font-semibold text-stone-500 underline-offset-4 hover:underline"
              >
                Send another
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-500">
              <MessageSquare className="h-3.5 w-3.5" /> Contact us
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold text-stone-900">
              Talk to a human.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-600">
              Questions about pricing, moving your menu across, or whether TableServe fits how your
              room actually works — send a note and we’ll come back to you.
            </p>

            <form onSubmit={submit} className="mt-8 max-w-xl space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-stone-700">
                  Your name <span className="font-normal text-stone-400">(optional)</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Asha Patel"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-[15px] font-normal outline-none transition focus:border-brand"
                  />
                </label>
                <label className="block text-sm font-semibold text-stone-700">
                  Email address
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@restaurant.com"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-[15px] font-normal outline-none transition focus:border-brand"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-stone-700">
                Message
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                  required
                  rows={7}
                  placeholder="Tell us about your restaurant and what you’re trying to solve…"
                  className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 px-3 py-2.5 text-[15px] font-normal leading-relaxed outline-none transition focus:border-brand"
                />
                <span className="mt-1 block text-right text-xs font-normal text-stone-400">
                  {message.length} / {MAX}
                </span>
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg" loading={sending} disabled={!canSend}>
                  <Send className="h-4 w-4" /> Send message
                </Button>
                <span className="flex items-center gap-1.5 text-xs text-stone-400">
                  <Mail className="h-3.5 w-3.5" /> We reply to the address you enter here.
                </span>
              </div>
            </form>
          </>
        )}
      </main>

      <footer className="border-t border-stone-100 py-8 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} TableServe ·{' '}
        <Link to="/terms" className="hover:text-stone-600">Terms of Use</Link> ·{' '}
        <Link to="/privacy" className="hover:text-stone-600">Privacy Policy</Link>
      </footer>
    </div>
  )
}
