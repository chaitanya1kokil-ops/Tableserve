import { useEffect, useState, useCallback, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Plus, Download, Printer, Trash2, Pencil, QrCode, Copy, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { tableUrl } from '../../lib/format'
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
            {tables.length} {tables.length === 1 ? 'table' : 'tables'} · customers scan to order
          </p>
        </div>
        <div className="flex gap-2">
          {tables.length > 0 && (
            <Button variant="outline" size="sm" onClick={printAll}>
              <Printer className="h-4 w-4" /> Print all
            </Button>
          )}
          <Button size="sm" onClick={() => setAddModal(true)}>
            <Plus className="h-4 w-4" /> Add tables
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No tables yet"
          description="Create your tables to generate a unique QR code for each. Print them and place them on the tables."
          action={
            <Button onClick={() => setAddModal(true)}>
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
        <h3 className="font-bold text-gray-900">{table.label}</h3>
        <div className="flex gap-1">
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

function AddTablesModal({ rid, existingCount, onClose, onSaved }) {
  const toast = useToast()
  const [count, setCount] = useState(1)
  const [prefix, setPrefix] = useState('Table')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const n = parseInt(count, 10)
    if (isNaN(n) || n < 1 || n > 100) return toast.error('Enter a number between 1 and 100.')
    setSaving(true)
    const rows = Array.from({ length: n }, (_, i) => ({
      restaurant_id: rid,
      label: `${prefix.trim() || 'Table'} ${existingCount + i + 1}`,
    }))
    const { error } = await supabase.from('tables').insert(rows)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(`${n} ${n === 1 ? 'table' : 'tables'} added.`)
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add tables"
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label prefix">
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Table" />
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
          Will create{' '}
          <strong>
            {prefix.trim() || 'Table'} {existingCount + 1}
          </strong>{' '}
          …{' '}
          <strong>
            {prefix.trim() || 'Table'} {existingCount + (parseInt(count, 10) || 1)}
          </strong>
        </p>
      </div>
    </Modal>
  )
}

function RenameModal({ table, onClose, onSaved }) {
  const toast = useToast()
  const [label, setLabel] = useState(table.label)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!label.trim()) return toast.error('Enter a label.')
    setSaving(true)
    const { error } = await supabase.from('tables').update({ label: label.trim() }).eq('id', table.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Rename table"
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
      <Field label="Table label" required>
        <Input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </Field>
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
