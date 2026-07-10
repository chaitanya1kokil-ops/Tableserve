import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'

// Shared shell for legal pages: light header, readable prose column, footer.
export default function LegalLayout({ title, effectiveDate, children }) {
  return (
    <div className="min-h-[100dvh] bg-white text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <Store className="h-5 w-5" />
            </span>
            TableServe
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-stone-500">
            <Link to="/terms" className="hover:text-stone-900">Terms</Link>
            <Link to="/privacy" className="hover:text-stone-900">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-2 text-sm text-stone-400">Effective date: {effectiveDate}</p>
        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <footer className="border-t border-stone-100 py-8 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} TableServe ·{' '}
        <Link to="/terms" className="hover:text-stone-600">Terms of Use</Link> ·{' '}
        <Link to="/privacy" className="hover:text-stone-600">Privacy Policy</Link>
      </footer>
    </div>
  )
}

export function Section({ heading, children }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-xl font-semibold text-stone-900">{heading}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-stone-600">{children}</div>
    </section>
  )
}
