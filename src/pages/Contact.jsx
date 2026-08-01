import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, ArrowLeft, Check } from 'lucide-react'
import Logo from '../components/Logo'

const MAX = 2000

// What a sender actually wants to know before typing: who reads it, how fast,
// and that it isn't a sales funnel.
const PROMISES = [
  ['A person, not a bot', 'Messages go straight to the founder.'],
  ['Usually same day', 'One business day at the outside.'],
  ['No sales sequence', 'You get an answer, not a drip campaign.'],
]

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const canSend = emailOk && message.trim().length > 0 && !sending

  const submit = async (e) => {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      })
      const data = await resp.json().catch(() => ({}))
      setSending(false)
      if (!resp.ok) return setError(data.error || 'That didn’t send. Please try again.')
      setSent(true)
    } catch {
      setSending(false)
      setError('That didn’t send — check your connection and try again.')
    }
  }

  const field =
    'w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-3 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10'

  return (
    <div className="min-h-[100dvh] bg-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ---------------------------------------------------- editorial side */}
      <aside className="relative overflow-hidden bg-stone-900 px-6 py-12 text-white sm:px-10 lg:flex lg:flex-col lg:justify-center lg:gap-14 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 70% at 8% 0%, rgba(180,83,9,.55), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(217,119,6,.28), transparent 60%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.7) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(80% 70% at 20% 10%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(80% 70% at 20% 10%, black, transparent)',
          }}
        />

        <div className="relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-extrabold tracking-tight text-white"
          >
            <Logo className="h-8 w-8" />
            TableServe
          </Link>

          <p className="mt-10 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-300/90 lg:mt-14">
            <span className="h-px w-8 bg-amber-300/40" />
            Get in touch
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Tell us about
            <br />
            your <span className="italic text-amber-300">restaurant</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
            Pricing, moving your menu across, or whether any of this fits the way your room actually
            runs on a Friday night — ask, and you’ll get a straight answer.
          </p>
        </div>

        <dl className="relative mt-10 space-y-5 lg:mt-0">
          {PROMISES.map(([term, detail]) => (
            <div key={term} className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-amber-400/20 ring-1 ring-amber-300/40">
                <Check className="h-3 w-3 text-amber-300" />
              </span>
              <div>
                <dt className="text-sm font-semibold text-white">{term}</dt>
                <dd className="text-sm text-white/60">{detail}</dd>
              </div>
            </div>
          ))}
        </dl>
      </aside>

      {/* --------------------------------------------------------- form side */}
      <main className="flex flex-col px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
          {sent ? (
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" />
              </span>
              <h2 className="mt-5 font-display text-3xl font-semibold text-stone-900">
                Message sent.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
                We’ll reply to <span className="font-semibold text-stone-900">{email.trim()}</span>.
                If it’s urgent, mention that in a follow-up and we’ll jump the queue.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-stone-800"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to home
                </Link>
                <button
                  onClick={() => {
                    setSent(false)
                    setMessage('')
                  }}
                  className="text-sm font-semibold text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline"
                >
                  Write another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="font-display text-2xl font-semibold text-stone-900">
                Send us a message
              </h2>
              <p className="mt-1.5 text-sm text-stone-500">
                Two fields are required. The rest is up to you.
              </p>

              <div className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                    Name <span className="font-normal text-stone-400">— optional</span>
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Asha Patel"
                    className={field}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                    Email address
                  </span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@restaurant.com"
                    className={field}
                  />
                  {email.length > 0 && !emailOk && (
                    <span className="mt-1.5 block text-xs font-medium text-amber-700">
                      That doesn’t look like an email address yet.
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-stone-700">
                    Message
                    <span
                      className={`text-xs font-normal tabular-nums ${
                        message.length > MAX * 0.9 ? 'text-amber-700' : 'text-stone-400'
                      }`}
                    >
                      {message.length}/{MAX}
                    </span>
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                    rows={6}
                    placeholder="How many tables do you run, and what’s getting in the way at the moment?"
                    className={`${field} resize-y leading-relaxed`}
                  />
                </label>
              </div>

              {error && (
                <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSend}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 sm:w-auto"
              >
                {sending ? 'Sending…' : (<><Send className="h-4 w-4" /> Send message</>)}
              </button>

              <p className="mt-6 text-xs leading-relaxed text-stone-400">
                We use what you write here only to reply to you. Nothing is shared, and there’s no
                mailing list to unsubscribe from.
              </p>
            </form>
          )}
        </div>

        <p className="mx-auto mt-10 w-full max-w-lg text-xs text-stone-400">
          <Link to="/" className="font-semibold text-stone-500 hover:text-stone-900">
            ← TableServe
          </Link>
          <span className="px-2">·</span>
          <Link to="/terms" className="hover:text-stone-600">Terms</Link>
          <span className="px-2">·</span>
          <Link to="/privacy" className="hover:text-stone-600">Privacy</Link>
        </p>
      </main>
    </div>
  )
}
