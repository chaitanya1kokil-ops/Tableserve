import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Truck,
  UtensilsCrossed,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase, uploadImage } from '../lib/supabase'
import { slugify } from '../lib/format'
import { CUISINES, ACCENT_PRESETS, CURRENCIES, PLANS } from '../lib/constants'
import { Button, Field, Input, Textarea, Select } from '../components/ui'
import ImageUpload from '../components/ImageUpload'
import Logo from '../components/Logo'

const STEPS = [
  { n: 1, label: 'Business', icon: Building2 },
  { n: 2, label: 'Your details', icon: User },
  { n: 3, label: 'Plan', icon: CreditCard },
  { n: 4, label: 'Finish', icon: ShieldCheck },
]

const LAST_STEP = STEPS.length

export default function Onboarding() {
  const { user, signOut, refreshRestaurant } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [form, setForm] = useState({
    // Business
    business_type: 'restaurant',
    name: '',
    cuisine: 'American',
    description: '',
    address: '',
    biz_phone: '',
    website: '',
    accent_color: ACCENT_PRESETS[0],
    // Your details
    full_name: user?.user_metadata?.full_name || '',
    owner_phone: '',
    title: 'Owner',
    // Plan
    plan: 'pro',
    interval: 'month',
    // Finish
    currency: 'USD',
    tax_rate: '',
    owner_pin: '',
  })
  const isTruck = form.business_type === 'food_truck'
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const next = () => {
    if (step === 1) {
      if (!form.name.trim())
        return toast.error(`Please enter your ${isTruck ? 'food truck' : 'restaurant'} name.`)
      if (!form.biz_phone.trim()) return toast.error('Please enter your business phone.')
      if (!form.address.trim()) return toast.error('Please enter your business address.')
    }
    if (step === 2 && !form.full_name.trim()) return toast.error('Please enter your name.')
    setStep((s) => Math.min(LAST_STEP, s + 1))
  }
  const back = () => setStep((s) => Math.max(1, s - 1))

  const submit = async () => {
    if (form.tax_rate === '' || form.tax_rate === null)
      return toast.error('Please enter your tax rate (use 0 if you don’t charge tax).')
    const taxRate = Number(form.tax_rate)
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100)
      return toast.error('Tax rate must be between 0 and 100.')
    if (!/^\d{4,6}$/.test(form.owner_pin))
      return toast.error('Please set an owner PIN — 4 to 6 digits.')

    setSaving(true)
    try {
      const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`
      const { data: restaurant, error: insErr } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: form.name.trim(),
          slug,
          cuisine: form.cuisine,
          description: form.description.trim() || null,
          phone: form.biz_phone.trim() || null,
          address: form.address.trim() || null,
          website: form.website.trim() || null,
          accent_color: form.accent_color,
          business_type: form.business_type,
          currency: form.currency,
          tax_rate: taxRate,
          plan: form.plan,
          // Stays 'pending' until Stripe Checkout completes (webhook flips it to
          // 'active'). Prevents skipping payment by hitting Back from Stripe.
          status: 'pending',
        })
        .select()
        .single()
      if (insErr) throw insErr

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: form.full_name.trim() || null,
        phone: form.owner_phone.trim() || null,
        title: form.title || null,
        restaurant_id: restaurant.id,
      })
      if (profErr) throw profErr

      await supabase.rpc('set_owner_pin', { p_pin: form.owner_pin })

      if (logoFile) {
        const path = await uploadImage(logoFile, `${restaurant.id}`, 'logo')
        await supabase.from('restaurants').update({ logo_url: path }).eq('id', restaurant.id)
      }

      // Start the subscription: redirect to Stripe Checkout to collect a card
      // and begin the 14-day free trial. If Stripe isn't configured, the API
      // returns { skip: true } and onboarding completes without payment.
      try {
        const resp = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            plan: form.plan,
            interval: form.interval,
            email: user.email,
          }),
        })
        const data = await resp.json().catch(() => ({}))
        if (data?.url) {
          window.location.href = data.url
          return
        }
      } catch {
        // Couldn't start checkout — fall through to the dashboard.
      }

      // Checkout didn't start (billing not configured) — activate so the owner
      // isn't stranded on the pending gate.
      await supabase.from('restaurants').update({ status: 'active' }).eq('id', restaurant.id)
      await refreshRestaurant()
      toast.success(`${isTruck ? 'Food truck' : 'Restaurant'} created! 🎉`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#faf6ef]">
      <header className="border-b border-stone-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-extrabold text-gray-900">
            <Logo className="h-8 w-8" />
            TableServe
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Stepper */}
        <div className="mb-7 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition ${
                    step >= s.n ? 'bg-brand text-white' : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {step > s.n ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <span
                  className={`mt-1 text-[11px] font-semibold ${step >= s.n ? 'text-stone-900' : 'text-stone-400'}`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: step > s.n ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm sm:p-6">
          {step === 1 && <BusinessStep form={form} set={set} setForm={setForm} isTruck={isTruck} setLogoFile={setLogoFile} />}
          {step === 2 && <DetailsStep form={form} set={set} email={user?.email} />}
          {step === 3 && <PlanStep form={form} setForm={setForm} isTruck={isTruck} />}
          {step === 4 && <FinishStep form={form} set={set} setForm={setForm} email={user?.email} isTruck={isTruck} />}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="outline" onClick={back} disabled={saving}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < LAST_STEP ? (
            <Button onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={saving} onClick={submit}>
              Start 14-day free trial
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- steps --- */
function BusinessStep({ form, set, setForm, isTruck, setLogoFile }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">About your business</h2>
        <p className="text-sm text-stone-500">What customers see when they scan your QR code.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'restaurant', icon: UtensilsCrossed, title: 'Restaurant', desc: 'Table QR codes, dine-in.' },
          { key: 'food_truck', icon: Truck, title: 'Food truck', desc: 'One QR, order by name.' },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() =>
              setForm({
                ...form,
                business_type: opt.key,
                plan: opt.key === 'food_truck' ? 'food_truck' : 'pro',
              })
            }
            className={`rounded-xl border-2 p-4 text-left transition ${
              form.business_type === opt.key ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <opt.icon className={`h-6 w-6 ${form.business_type === opt.key ? 'text-brand' : 'text-gray-400'}`} />
            <p className="mt-2 font-bold text-gray-900">{opt.title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-[130px,1fr]">
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Logo</p>
          <ImageUpload value={null} onChange={setLogoFile} label="Logo" />
        </div>
        <div className="space-y-4">
          <Field label={isTruck ? 'Food truck name' : 'Restaurant name'} required>
            <Input value={form.name} onChange={set('name')} placeholder={isTruck ? 'Smoke & Barrel BBQ' : 'Bella Napoli'} />
          </Field>
          <Field label="Cuisine" required>
            <Select value={form.cuisine} onChange={set('cuisine')}>
              {CUISINES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <Field label="Short description" hint="A line that sells the vibe.">
        <Textarea value={form.description} onChange={set('description')} placeholder="Wood-fired Neapolitan pizza & handmade pasta." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business phone" required>
          <Input value={form.biz_phone} onChange={set('biz_phone')} placeholder="(555) 123-4567" />
        </Field>
        <Field label="Website">
          <Input value={form.website} onChange={set('website')} placeholder="yoursite.com" />
        </Field>
      </div>
      <Field label="Address" required>
        <Input value={form.address} onChange={set('address')} placeholder="12 Main St, Toronto" />
      </Field>

      <div>
        <p className="text-sm font-semibold text-gray-700">Accent color</p>
        <p className="text-xs text-gray-500">Used across your customer menu.</p>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, accent_color: c })}
              className="grid h-9 w-9 place-items-center rounded-full ring-2 ring-offset-2 transition"
              style={{ backgroundColor: c, '--tw-ring-color': form.accent_color === c ? c : 'transparent' }}
            >
              {form.accent_color === c && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DetailsStep({ form, set, email }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">Your details</h2>
        <p className="text-sm text-stone-500">Who runs the account. Only you see this.</p>
      </div>
      <Field label="Your name" required>
        <Input value={form.full_name} onChange={set('full_name')} placeholder="Alex Chef" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your mobile" hint="For account & support.">
          <Input value={form.owner_phone} onChange={set('owner_phone')} placeholder="(555) 987-6543" />
        </Field>
        <Field label="Your role">
          <Select value={form.title} onChange={set('title')}>
            {['Owner', 'Manager', 'Staff'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
        You’ll sign in with <strong className="text-stone-800">{email}</strong>.
      </div>
    </div>
  )
}

// Feature bullets shown on each plan card, derived from PLANS (single source
// of truth) so pricing and limits never drift from the landing page / admin.
function planFeatures(key) {
  if (key === 'food_truck') {
    return [
      'Single QR — order by name',
      'Online card payments',
      'Loyalty & rewards',
      '0% commission on orders',
    ]
  }
  const p = PLANS[key]
  const f = ['QR ordering & kitchen display', '0% commission on every order']
  f.push(p.maxTables === null ? 'Unlimited tables' : `Up to ${p.maxTables} tables`)
  if (p.loyalty) f.push('Loyalty & rewards')
  if (p.multiBrand) f.push('Multiple brands / locations')
  return f
}

// Yearly = 10× monthly (2 months free), matching the billing endpoints.
const yearlyTotal = (monthly) => monthly * 10
const yearlySavings = (monthly) => monthly * 2

function PlanStep({ form, setForm, isTruck }) {
  const tiers = isTruck ? ['food_truck'] : ['starter', 'pro', 'premium']
  const yearly = form.interval === 'year'
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">
          {isTruck ? 'Your plan' : 'Choose your plan'}
        </h2>
        <p className="text-sm text-stone-500">
          {isTruck ? 'Your food truck plan' : 'Every plan'} starts with a{' '}
          <strong className="text-stone-700">14-day free trial</strong>. No charge today — you won’t
          be billed until the trial ends, and you can {isTruck ? 'cancel' : 'switch plans or cancel'}{' '}
          anytime before then.
        </p>
      </div>

      {/* Monthly / Yearly toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setForm({ ...form, interval: 'month' })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              !yearly ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, interval: 'year' })}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              yearly ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            Yearly
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              2 MONTHS FREE
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {tiers.map((key) => {
          const p = PLANS[key]
          const selected = form.plan === key
          const price = yearly ? yearlyTotal(p.price) : p.price
          const unit = yearly ? 'yr' : 'mo'
          return (
            <button
              key={key}
              type="button"
              onClick={() => setForm({ ...form, plan: key })}
              className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                selected ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 ${
                      selected ? 'border-brand bg-brand' : 'border-gray-300'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{p.label}</span>
                  {key === 'pro' && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                      Popular
                    </span>
                  )}
                </div>
                <div className="whitespace-nowrap text-right">
                  <span className="text-2xl font-extrabold text-gray-900">
                    ${price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500"> CAD/{unit}</span>
                  {yearly && (
                    <p className="text-xs font-semibold text-emerald-600">
                      Save ${yearlySavings(p.price).toLocaleString()}/yr
                    </p>
                  )}
                </div>
              </div>
              <ul className="mt-3 grid gap-1.5 pl-7 sm:grid-cols-2">
                {planFeatures(key).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Check className="h-4 w-4 flex-shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-brand" />
        Card details and the 14-day trial come next — you’re never charged during the trial.
      </div>
    </div>
  )
}

function FinishStep({ form, set, setForm, email, isTruck }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">Preferences & security</h2>
        <p className="text-sm text-stone-500">A few last settings — all changeable later.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency" required>
          <Select value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tax rate (%)" hint="Applied to every order." required>
          <Input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={set('tax_rate')} placeholder="e.g. 13" />
        </Field>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ShieldCheck className="h-4 w-4 text-brand" /> Owner PIN <span className="text-red-500">*</span>
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          A 4–6 digit code only you know. Staff run the {isTruck ? 'truck' : 'tablet'} day-to-day;
          enter this PIN to switch to owner view and see revenue and analytics. Required — you can
          change it later in Settings.
        </p>
        <input
          inputMode="numeric"
          type="password"
          maxLength={6}
          value={form.owner_pin}
          onChange={(e) => setForm({ ...form, owner_pin: e.target.value.replace(/\D/g, '') })}
          placeholder="e.g. 1234"
          className="mt-3 w-40 rounded-xl border border-gray-300 px-3.5 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-brand"
        />
      </div>

      <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
        Signing in as <strong className="text-stone-800">{email}</strong>.
      </div>
    </div>
  )
}
