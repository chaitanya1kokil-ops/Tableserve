import { Link } from 'react-router-dom'
import { QrCode, UtensilsCrossed, LayoutDashboard, Zap, ArrowRight, Store } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'

const features = [
  {
    icon: QrCode,
    title: 'Scan to order',
    desc: 'Customers scan a table QR code and order in under a minute — no app, no login.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu in minutes',
    desc: 'Categories, photos, modifiers and availability toggles. Update prices instantly.',
  },
  {
    icon: LayoutDashboard,
    title: 'Live orders board',
    desc: 'Orders stream in by table in real time. Move them New → Preparing → Ready → Served.',
  },
  {
    icon: Zap,
    title: 'Your brand',
    desc: 'Your logo and accent color on every menu. One platform, many restaurants, fully isolated.',
  },
]

export default function Landing() {
  const { user, isAnonymous, profile, restaurant } = useAuth()
  const loggedIn = user && !isAnonymous

  const ctaTo = profile?.role === 'platform_admin' ? '/admin' : restaurant ? '/dashboard' : '/onboarding'

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 font-extrabold text-gray-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <Store className="h-5 w-5" />
          </span>
          TableServe
        </div>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link to={ctaTo}>
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-10 sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand">
            <Zap className="h-3.5 w-3.5" /> QR ordering for every restaurant
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl">
            Scan. Order. <span className="text-brand">Enjoy.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
            The multi-restaurant ordering platform. Spin up your menu, print table QR codes,
            and watch orders roll in — all in real time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={loggedIn ? ctaTo : '/signup'} className="w-full sm:w-auto">
              <Button size="lg" className="w-full">
                {loggedIn ? 'Open dashboard' : 'Start your restaurant'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="mx-auto mt-14 max-w-sm">
          <div className="rounded-[2.5rem] border-8 border-gray-900 bg-gray-900 shadow-2xl">
            <div className="overflow-hidden rounded-[2rem] bg-gray-50">
              <div className="bg-brand px-5 py-6 text-white">
                <p className="text-xs leading-none opacity-80">Table 7</p>
                <p className="text-xl font-bold">Bella Napoli</p>
              </div>
              <div className="space-y-3 p-4">
                {['Margherita Pizza · $14', 'Truffle Pasta · $19', 'Tiramisu · $8'].map((x) => (
                  <div key={x} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-200 to-red-200" />
                    <span className="text-sm font-medium text-gray-800">{x}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-gray-900 py-3 text-center text-sm font-semibold text-white">
                  Place order · $41.00
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex rounded-xl bg-red-50 p-2.5 text-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-gray-900">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        TableServe · Built with React &amp; Supabase
      </footer>
    </div>
  )
}
