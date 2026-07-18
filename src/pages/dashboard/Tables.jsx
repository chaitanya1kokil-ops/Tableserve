import { useEffect, useState, useCallback, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Plus, Download, Printer, Trash2, Pencil, QrCode, Copy, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { tableUrl } from '../../lib/format'
import { tableLimit, PLANS, allowsCounterQr } from '../../lib/constants'
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  EmptyState,
  FullPageSpinner,
} from '../../components/ui'

export default function Tables() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const rid = restaurant.id
  const gridRef = useRef(null)

  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [renaming, setRenaming] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', rid)
      .order('created_at')
    setTables(data || [])
    setLoading(false)
  }, [rid])

  useEffect(() => {
    load()
  }, [load])

  const limit = tableLimit(restaurant) // null = unlimited
  const remaining = limit == null ? Infinity : Math.max(limit - tables.length, 0)
  const atCap = remaining <= 0

  const openAdd = () => {
    if (atCap) {
      toast.error(
        `Your ${PLANS[restaurant.plan]?.label || 'plan'} allows up to ${limit} tables. Upgrade to add more.`,
      )
      return
    }
    setAddModal(true)
  }

  const deleteTable = async (t) => {
    if (!confirm(`Delete "${t.label}"? Its QR code will stop working.`)) return
    const { error } = await supabase.from('tables').delete().eq('id', t.id)
    if (error) return toast.error(error.message)
    toast.success('Table deleted.')
    load()
  }

  const printAll = () => {
    if (!gridRef.current) return
    const cards = [...gridRef.current.querySelectorAll('[data-table-card]')]
    const entries = cards
      .map((card) => {
        const canvas = card.querySelector('canvas')
        return {
          label: card.getAttribute('data-label'),
          url: canvas?.toDataURL('image/png'),
        }
      })
      .filter((e) => e.url)
    openPrintWindow(restaurant.name, entries)
  }

  if (loading) return <FullPageSpinner label="Loading tables…" />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables &amp; QR codes</h1>
          <p className="text-sm text-gray-500">
            {tables.length}
            {limit != null ? ` / ${limit}` : ''} {tables.length === 1 ? 'table' : 'tables'} ·
            customers scan to order
          </p>
        </div>
        <div className="flex gap-2">
          {tables.length > 0 && (
            <Button variant="outline" size="sm" onClick={printAll}>
              <Printer className="h-4 w-4" /> Print all
            </Button>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add tables
          </Button>
        </div>
      </div>

      {atCap && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <QrCode className="h-4 w-4 flex-shrink-0" />
          You’ve reached the {PLANS[restaurant.plan]?.label || 'plan'} limit of {limit} tables.
          Upgrade your plan to add more.
        </div>
      )}

      {tables.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No tables yet"
          description="Create your tables to generate a unique QR code for each. Print them and place them on the tables."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add tables
            </Button>
          }
        />
      ) : (
        <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              restaurantId={rid}
              onRename={() => setRenaming(t)}
              onDelete={() => deleteTable(t)}
            />
          ))}
        </div>
      )}

      {addModal && (
        <AddTablesModal
          rid={rid}
          existingCount={tables.length}
          remaining={remaining}
          canCounter={allowsCounterQr(restaurant)}
          onClose={() => setAddModal(false)}
          onSaved={() => {
            setAddModal(false)
            load()
          }}
        />
      )}

      {renaming && (
        <RenameModal
          table={renaming}
          onClose={() => setRenaming(null)}
          onSaved={() => {
            setRenaming(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function TableCard({ table, restaurantId, onRename, onDelete }) {
  const toast = useToast()
  const url = tableUrl(restaurantId, table.id)

  const download = (e) => {
    const canvas = e.currentTarget.closest('[data-table-card]')?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${table.label.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    a.click()
  }

  const print = (e) => {
    const canvas = e.currentTarget.closest('[data-table-card]')?.querySelector('canvas')
    if (!canvas) return
    openPrintWindow(table.label, [{ label: table.label, url: canvas.toDataURL('image/png') }])
  }

  const copy = () => {
    navigator.clipboard?.writeText(url)
    toast.success('Link copied.')
  }

  return (
    <Card className="p-4" data-table-card data-label={table.label}>
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-bold text-gray-900">{table.label}</h3>
          {table.kind === 'counter' && (
            <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Takeout
            </span>
          )}
          {table.kind === 'counter' && table.stripe_link && (
            <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Pays online
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 gap-1">
          <button onClick={onRename} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
        {/* Rendered large (512) for crisp downloads, displayed small via CSS. */}
        <QRCodeCanvas
          value={url}
          size={512}
          level="M"
          marginSize={2}
          style={{ width: 160, height: 160 }}
        />
      </div>

      <button
        onClick={copy}
        className="mt-3 flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-100"
        title={url}
      >
        <Copy className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{url}</span>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={print}>
          <Printer className="h-4 w-4" />
        </Button>
        <a href={url} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </Card>
  )
}

function AddTablesModal({ rid, existingCount, remaining = Infinity, canCounter = false, onClose, onSaved }) {
  const toast = useToast()
  const [kind, setKind] = useState('table')
  const [count, setCount] = useState(1)
  const [prefix, setPrefix] = useState('Table')
  const [stripeLink, setStripeLink] = useState('')
  const [saving, setSaving] = useState(false)

  const isCounter = kind === 'counter'

  // Switch type; swap the default prefix unless the user typed a custom one.
  const pickKind = (k) => {
    setKind(k)
    setPrefix((p) =>
      p === 'Table' || p === 'Counter' || !p.trim() ? (k === 'counter' ? 'Counter' : 'Table') : p,
    )
    if (k === 'counter') setCount(1)
  }

  const base = prefix.trim() || (isCounter ? 'Counter' : 'Table')
  const labelFor = (i, n) => (isCounter ? (n === 1 ? base : `${base} ${i + 1}`) : `${base} ${existingCount + i + 1}`)

  const save = async () => {
    const n = parseInt(count, 10)
    if (isNaN(n) || n < 1 || n > 100) return toast.error('Enter a number between 1 and 100.')
    if (n > remaining)
      return toast.error(
        `Your plan has room for ${remaining} more ${remaining === 1 ? 'QR' : 'QRs'}. Upgrade to add more.`,
      )
    setSaving(true)
    const rows = Array.from({ length: n }, (_, i) => ({
      restaurant_id: rid,
      label: labelFor(i, n),
      kind,
      stripe_link: isCounter ? stripeLink.trim() || null : null,
    }))
    const { error } = await supabase.from('tables').insert(rows)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(isCounter ? 'Counter QR added.' : `${n} ${n === 1 ? 'table' : 'tables'} added.`)
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isCounter ? 'Add counter QR' : 'Add tables'}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            Add
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Type: dining table vs counter/register (takeout) — counter is Pro+ */}
        {canCounter && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            {[
              ['table', 'Dining table'],
              ['counter', 'Counter (takeout)'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => pickKind(k)}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  kind === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isCounter && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            A counter QR is for the line at the register: scanning it asks the customer’s name and
            starts a <strong>takeout</strong> order — no table needed.
          </p>
        )}

        {isCounter && (
          <Field
            label="Stripe payment link (optional)"
            hint="If set, customers are sent here to pay right after placing their order. Leave blank for pay-at-counter."
          >
            <Input
              type="url"
              value={stripeLink}
              onChange={(e) => setStripeLink(e.target.value)}
              placeholder="https://buy.stripe.com/…"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={isCounter ? 'Name' : 'Label prefix'}>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={isCounter ? 'Counter' : 'Table'}
            />
          </Field>
          <Field label="How many?">
            <Input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
        </div>

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Will create <strong>{labelFor(0, parseInt(count, 10) || 1)}</strong>
          {(parseInt(count, 10) || 1) > 1 && (
            <>
              {' '}… <strong>{labelFor((parseInt(count, 10) || 1) - 1, parseInt(count, 10) || 1)}</strong>
            </>
          )}
        </p>
      </div>
    </Modal>
  )
}

function RenameModal({ table, onClose, onSaved }) {
  const toast = useToast()
  const isCounter = table.kind === 'counter'
  const [label, setLabel] = useState(table.label)
  const [stripeLink, setStripeLink] = useState(table.stripe_link || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!label.trim()) return toast.error('Enter a label.')
    setSaving(true)
    const patch = { label: label.trim() }
    if (isCounter) patch.stripe_link = stripeLink.trim() || null
    const { error } = await supabase.from('tables').update(patch).eq('id', table.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isCounter ? 'Edit counter QR' : 'Rename table'}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={isCounter ? 'Name' : 'Table label'} required>
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </Field>
        {isCounter && (
          <Field
            label="Stripe payment link (optional)"
            hint="Customers are sent here to pay after ordering. Leave blank for pay-at-counter."
          >
            <Input
              type="url"
              value={stripeLink}
              onChange={(e) => setStripeLink(e.target.value)}
              placeholder="https://buy.stripe.com/…"
            />
          </Field>
        )}
      </div>
    </Modal>
  )
}

/** Open a print-friendly window with one or more QR codes. */
function openPrintWindow(title, entries) {
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  const cards = entries
    .map(
      (e) => `
      <div class="card">
        <img src="${e.url}" alt="${e.label}" />
        <div class="label">${e.label}</div>
        <div class="hint">Scan to view the menu &amp; order</div>
      </div>`,
    )
    .join('')

  win.document.write(`
    <!doctype html><html><head><title>${title} — QR codes</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 16px; }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; text-align: center; page-break-inside: avoid; }
      .card img { width: 220px; height: 220px; }
      .label { font-size: 20px; font-weight: 800; margin-top: 8px; }
      .hint { font-size: 12px; color: #6b7280; margin-top: 4px; }
      @media print { .card { border-color: #ddd; } }
    </style></head>
    <body>
      <h1>${title} — Table QR codes</h1>
      <div class="grid">${cards}</div>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`)
  win.document.close()
}
