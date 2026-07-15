import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store,
  Check,
  Truck,
  UtensilsCrossed,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase, uploadImage } from '../lib/supabase'
import { slugify } from '../lib/format'
import { CUISINES, ACCENT_PRESETS, CURRENCIES } from '../lib/constants'
import { Button, Field, Input, Textarea, Select } from '../components/ui'
import ImageUpload from '../components/ImageUpload'

const STEPS = [
  { n: 1, label: 'Business', icon: Building2 },
  { n: 2, label: 'Your details', icon: User },
  { n: 3, label: 'Finish', icon: ShieldCheck },
]

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
    // Finish
    currency: 'USD',
    tax_rate: '',
    owner_pin: '',
  })
  const isTruck = form.business_type === 'food_truck'
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const next = () => {
    if (step === 1 && !form.name.trim())
      return toast.error(`Please enter your ${isTruck ? 'food truck' : 'restaurant'} name.`)
    if (step === 2 && !form.full_name.trim()) return toast.error('Please enter your name.')
    setStep((s) => Math.min(3, s + 1))
  }
  const back = () => setStep((s) => Math.max(1, s - 1))

  const submit = async () => {
    const taxRate = form.tax_rate === '' ? 0 : Number(form.tax_rate)
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100)
      return toast.error('Tax rate must be between 0 and 100.')
    if (form.owner_pin && !/^\d{4,6}$/.test(form.owner_pin))
      return toast.error('Owner PIN must be 4 to 6 digits.')

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
          status: 'active',
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

      if (form.owner_pin) await supabase.rpc('set_owner_pin', { p_pin: form.owner_pin })

      if (logoFile) {
        const path = await uploadImage(logoFile, `${restaurant.id}`, 'logo')
        await supabase.from('restaurants').update({ logo_url: path }).eq('id', restaurant.id)
      }

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
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <Store className="h-5 w-5" />
            </span>
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
          {step === 3 && <FinishStep form={form} set={set} setForm={setForm} email={user?.email} isTruck={isTruck} />}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="outline" onClick={back} disabled={saving}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={saving} onClick={submit}>
              {isTruck ? 'Create food truck' : 'Create restaurant'}
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
            onClick={() => setForm({ ...form, business_type: opt.key })}
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
          <Field label="Cuisine">
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
        <Field label="Business phone">
          <Input value={form.biz_phone} onChange={set('biz_phone')} placeholder="(555) 123-4567" />
        </Field>
        <Field label="Website">
          <Input value={form.website} onChange={set('website')} placeholder="yoursite.com" />
        </Field>
      </div>
      <Field label="Address">
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
            {['Owner', 'Co-owner', 'Manager', 'Other'].map((r) => (
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

function FinishStep({ form, set, setForm, email, isTruck }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">Preferences & security</h2>
        <p className="text-sm text-stone-500">A few last settings — all changeable later.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency">
          <Select value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tax rate (%)" hint="Applied to every order.">
          <Input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={set('tax_rate')} placeholder="e.g. 13" />
        </Field>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ShieldCheck className="h-4 w-4 text-brand" /> Owner PIN (optional)
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          A 4–6 digit code only you know. Staff run the {isTruck ? 'truck' : 'tablet'} day-to-day;
          enter this PIN to switch to owner view and see revenue and analytics. You can set it later
          in Settings.
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
