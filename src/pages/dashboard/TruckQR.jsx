import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Printer, Copy, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui'

// A food truck has one QR for the whole truck (no tables). It points at the
// orderable menu; guests scan, order by name, and pay.
export default function TruckQR() {
  const { restaurant } = useAuth()
  const toast = useToast()
  const cardRef = useRef(null)

  const url = `${window.location.origin}/r/${restaurant.id}`

  const canvas = () => cardRef.current?.querySelector('canvas')

  const download = () => {
    const c = canvas()
    if (!c) return
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = `${(restaurant.name || 'food-truck').replace(/\s+/g, '-').toLowerCase()}-qr.png`
    a.click()
  }

  const print = () => {
    const c = canvas()
    if (!c) return
    const img = c.toDataURL('image/png')
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`
      <!doctype html><html><head><title>${restaurant.name} — QR</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 48px;
               display: flex; flex-direction: column; align-items: center; text-align: center; }
        img { width: 360px; height: 360px; }
        .name { font-size: 32px; font-weight: 800; margin-top: 16px; }
        .hint { font-size: 16px; color: #6b7280; margin-top: 6px; }
      </style></head>
      <body>
        <img src="${img}" alt="QR" />
        <div class="name">${restaurant.name}</div>
        <div class="hint">Scan to see the menu &amp; order</div>
        <script>window.onload = () => window.print();</script>
      </body></html>`)
    win.document.close()
  }

  const copy = () => {
    navigator.clipboard?.writeText(url)
    toast.success('Link copied.')
  }

  return (
    <div className="pb-8">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Your QR code</h1>
        <p className="mt-1 text-sm text-stone-500">
          Print this and stick it on your truck. Customers scan it to see the menu, order by name,
          and pay.
        </p>
      </div>

      <div className="mx-auto max-w-md rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-stone-100">
        <div ref={cardRef} className="mx-auto inline-block rounded-2xl bg-white p-4 ring-1 ring-stone-100">
          {/* Rendered large (512) for crisp prints, shown smaller via CSS. */}
          <QRCodeCanvas value={url} size={512} level="M" className="h-56 w-56" includeMargin />
        </div>
        <p className="mt-4 font-display text-xl font-semibold text-stone-900">{restaurant.name}</p>
        <p className="text-sm text-stone-500">Scan to order</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={download}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button variant="outline" onClick={print}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" /> Copy link
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 border-t border-stone-100 pt-4">
          <code className="truncate rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600">{url}</code>
          <a href={url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-stone-700">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
