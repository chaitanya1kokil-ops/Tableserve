import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Check, Truck, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase, uploadImage } from '../lib/supabase'
import { slugify } from '../lib/format'
import { CUISINES, ACCENT_PRESETS } from '../lib/constants'
import { Button, Field, Input, Textarea, Select } from '../components/ui'
import ImageUpload from '../components/ImageUpload'

export default function Onboarding() {
  const { user, signOut, refreshRestaurant } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    cuisine: 'American',
    description: '',
    phone: '',
    address: '',
    accent_color: ACCENT_PRESETS[0],
    business_type: 'restaurant',
  })
  const isTruck = form.business_type === 'food_truck'
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Please enter a restaurant name.')
      return
    }
    setSaving(true)
    try {
      // 1. Create the restaurant (owner_id must equal auth.uid per RLS).
      const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`
      const { data: restaurant, error: insErr } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: form.name.trim(),
          slug,
          cuisine: form.cuisine,
          description: form.description.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          accent_color: form.accent_color,
          business_type: form.business_type,
          status: 'active',
        })
        .select()
        .single()
      if (insErr) throw insErr

      // 2. Link the profile to the restaurant (enables tenant-scoped RLS + storage).
      //    Upsert (not update) in case the signup trigger hasn't created the row yet.
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        restaurant_id: restaurant.id,
      })
      if (profErr) throw profErr

      // 3. Upload the logo now that the profile is linked (storage RLS passes).
      if (logoFile) {
        const path = await uploadImage(logoFile, `${restaurant.id}`, 'logo')
        await supabase.from('restaurants').update({ logo_url: path }).eq('id', restaurant.id)
      }

      await refreshRestaurant()
      toast.success('Restaurant created! 🎉')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
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
        <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
        <p className="mt-1 text-sm text-gray-500">
          This is what customers see when they scan your QR code. You can change everything later.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-6">
          {/* Business type */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">What are you?</p>
            <p className="text-xs text-gray-500">This shapes how ordering works for your guests.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                {
                  key: 'restaurant',
                  icon: UtensilsCrossed,
                  title: 'Restaurant',
                  desc: 'Table QR codes, dine-in ordering, pay at the end.',
                },
                {
                  key: 'food_truck',
                  icon: Truck,
                  title: 'Food truck',
                  desc: 'One QR, order by name, pay upfront, collect when ready.',
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setForm({ ...form, business_type: opt.key })}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    form.business_type === opt.key
                      ? 'border-brand bg-brand/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <opt.icon
                    className={`h-6 w-6 ${form.business_type === opt.key ? 'text-brand' : 'text-gray-400'}`}
                  />
                  <p className="mt-2 font-bold text-gray-900">{opt.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-[140px,1fr]">
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Logo</p>
                <ImageUpload value={null} onChange={setLogoFile} label="Logo" />
              </div>
              <div className="space-y-4">
                <Field label={isTruck ? 'Food truck name' : 'Restaurant name'} required>
                  <Input
                    value={form.name}
                    onChange={set('name')}
                    placeholder={isTruck ? 'Smoke & Barrel BBQ' : 'Bella Napoli'}
                  />
                </Field>
                <Field label="Cuisine">
                  <Select value={form.cuisine} onChange={set('cuisine')}>
                    {CUISINES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Short description" hint="A line that sells the vibe.">
                <Textarea
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Wood-fired Neapolitan pizza & handmade pasta."
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <Input value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" />
                </Field>
                <Field label="Address">
                  <Input value={form.address} onChange={set('address')} placeholder="12 Main St" />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Accent color</p>
            <p className="text-xs text-gray-500">Used across your customer menu.</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
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
              <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-gray-300 bg-white text-xs text-gray-500">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={set('accent_color')}
                  className="h-9 w-9 cursor-pointer opacity-0"
                />
                <span className="pointer-events-none absolute">+</span>
              </label>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={saving}>
            {isTruck ? 'Create food truck' : 'Create restaurant'}
          </Button>
        </form>
      </div>
    </div>
  )
}
