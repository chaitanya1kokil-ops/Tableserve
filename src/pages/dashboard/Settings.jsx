import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Check, ExternalLink, Store, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase, uploadImage } from '../../lib/supabase'
import { CUISINES, ACCENT_PRESETS, CURRENCIES, DAYS } from '../../lib/constants'
import { Button, Card, Field, Input, Textarea, Select } from '../../components/ui'
import ImageUpload from '../../components/ImageUpload'

export default function Settings() {
  const { restaurant, refreshRestaurant } = useAuth()
  const { muted, toggleMute } = useOutletContext()
  const toast = useToast()

  const [form, setForm] = useState({
    name: restaurant.name || '',
    cuisine: restaurant.cuisine || 'American',
    description: restaurant.description || '',
    phone: restaurant.phone || '',
    address: restaurant.address || '',
    accent_color: restaurant.accent_color || ACCENT_PRESETS[0],
    currency: restaurant.currency || 'USD',
    tax_rate: restaurant.tax_rate ?? 0,
  })
  const [hours, setHours] = useState(restaurant.hours || {})
  const [logoFile, setLogoFile] = useState(undefined)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    if (!form.name.trim()) return toast.error('Restaurant name is required.')
    const taxRate = Number(form.tax_rate)
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100)
      return toast.error('Tax rate must be between 0 and 100.')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        cuisine: form.cuisine,
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        accent_color: form.accent_color,
        currency: form.currency,
        tax_rate: taxRate,
        hours,
      }

      if (logoFile instanceof File) {
        payload.logo_url = await uploadImage(logoFile, `${restaurant.id}`, 'logo')
      } else if (logoFile === null) {
        payload.logo_url = null
      }

      const { error } = await supabase.from('restaurants').update(payload).eq('id', restaurant.id)
      if (error) throw error
      await refreshRestaurant()
      toast.success('Settings saved.')
    } catch (err) {
      toast.error(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const publicUrl = `${window.location.origin}/r/${restaurant.id}`

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your restaurant profile and branding.</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-gray-900">Profile</h2>
          <div className="grid gap-5 sm:grid-cols-[140px,1fr]">
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700">Logo</p>
              <ImageUpload value={restaurant.logo_url} onChange={setLogoFile} label="Logo" />
            </div>
            <div className="space-y-4">
              <Field label="Restaurant name" required>
                <Input value={form.name} onChange={set('name')} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cuisine">
                  <Select value={form.cuisine} onChange={set('cuisine')}>
                    {CUISINES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Currency">
                  <Select value={form.currency} onChange={set('currency')}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tax rate (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={set('tax_rate')}
                    placeholder="e.g. 13"
                  />
                </Field>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Description">
              <Textarea value={form.description} onChange={set('description')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Address">
                <Input value={form.address} onChange={set('address')} />
              </Field>
            </div>
          </div>
        </Card>

        {/* Branding */}
        <Card className="p-5">
          <h2 className="mb-1 font-bold text-gray-900">Accent color</h2>
          <p className="mb-3 text-sm text-gray-500">Shown across your customer menu.</p>
          <div className="flex flex-wrap gap-2.5">
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
            <label className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-gray-300 bg-white text-gray-500">
              <input
                type="color"
                value={form.accent_color}
                onChange={set('accent_color')}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span>+</span>
            </label>
          </div>
        </Card>

        {/* Hours */}
        <Card className="p-5">
          <h2 className="mb-1 font-bold text-gray-900">Opening hours</h2>
          <p className="mb-3 text-sm text-gray-500">Optional — shown on your menu page.</p>
          <div className="space-y-2">
            {DAYS.map((d) => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-gray-600">{d.label}</span>
                <Input
                  value={hours[d.key] || ''}
                  onChange={(e) => setHours({ ...hours, [d.key]: e.target.value })}
                  placeholder="9:00 AM – 10:00 PM (or Closed)"
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <h2 className="mb-1 font-bold text-gray-900">Notifications</h2>
          <p className="mb-3 text-sm text-gray-500">
            Sounds on this device: a ring when a new order arrives, a chime when a customer
            taps “Call server”, and a loud bell when the kitchen marks an order ready.
          </p>
          <button
            type="button"
            onClick={toggleMute}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              {muted ? (
                <VolumeX className="h-5 w-5 text-gray-400" />
              ) : (
                <Volume2 className="h-5 w-5 text-emerald-600" />
              )}
              <span>
                <span className="block text-sm font-semibold text-gray-800">Notification sounds</span>
                <span className="block text-xs text-gray-500">
                  {muted ? 'Muted' : 'On — tap to preview'}
                </span>
              </span>
            </span>
            <span
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                muted ? 'bg-gray-300' : 'bg-emerald-500'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  muted ? 'translate-x-0.5' : 'translate-x-[22px]'
                }`}
              />
            </span>
          </button>
        </Card>

        {/* Public link */}
        <Card className="p-5">
          <h2 className="mb-1 font-bold text-gray-900">Your public menu</h2>
          <p className="mb-3 text-sm text-gray-500">
            Customers reach a table-specific menu via QR codes. This is the general browse link.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {publicUrl}
            </code>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> Open
              </Button>
            </a>
          </div>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-20 z-10 mt-6 lg:bottom-4">
        <Button size="lg" className="w-full shadow-lg" loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  )
}
