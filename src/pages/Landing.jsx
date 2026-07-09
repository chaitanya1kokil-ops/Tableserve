import { Link } from 'react-router-dom'
import {
  QrCode,
  UtensilsCrossed,
  LayoutDashboard,
  Zap,
  ArrowRight,
  Store,
  Receipt,
  Timer,
  ClipboardCheck,
  Users,
  BarChart3,
  Palette,
  Check,
  LogIn,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'

const efficiencyPoints = [
  {
    icon: Timer,
    title: 'Turn tables faster',
    desc: 'Guests order the moment they sit down — no waiting to flag someone for a menu, an order, or the bill. Every saved minute is a table served sooner.',
  },
  {
    icon: ClipboardCheck,
    title: 'Zero order-entry errors',
    desc: 'Orders go straight from the guest to the kitchen exactly as typed — items, modifiers, allergy notes. No misheard dishes, no handwriting to decipher.',
  },
  {
    icon: Users,
    title: 'Staff focus on hospitality',
    desc: 'Servers stop being order-takers. The "Call server" and "Request bill" buttons tell them exactly which table needs them, and why.',
  },
  {
    icon: BarChart3,
    title: 'Know your numbers',
    desc: 'A live overview of revenue, order volume and best-sellers — filterable by day — so you can staff, stock and price with facts, not guesses.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Build your menu',
    desc: 'Add categories, items, photos and modifiers in the dashboard. Toggle availability any time — 86 a dish in one tap.',
  },
  {
    n: '2',
    title: 'Print your QR codes',
    desc: 'Every table gets its own QR code, generated automatically. Print, place, done.',
  },
  {
    n: '3',
    title: 'Serve orders in real time',
    desc: 'Orders stream onto the live board and kitchen display the second guests confirm. Move them New → Preparing → Ready → Served.',
  },
]

const featureBlocks = [
  {
    icon: LayoutDashboard,
    title: 'A live orders board your whole team can run',
    points: [
      'Orders grouped by table, updating in real time — no refresh, no polling',
      'One-tap status changes with a full-screen kitchen display mode',
      'Staff can enter phone or walk-up orders from the same screen',
      'A chime alerts the floor when a guest calls a server',
    ],
  },
  {
    icon: UtensilsCrossed,
    title: 'A menu you can change in seconds, not print runs',
    points: [
      'Categories, photos, descriptions and prices — edited live',
      'Modifier groups with price deltas: sizes, spice levels, add-ons',
      'Sold out? Toggle an item off and it vanishes from every table instantly',
      'Guests browse in their language of prices — your currency, your tax rate',
    ],
  },
  {
    icon: Receipt,
    title: 'Billing that adds up by itself',
    points: [
      'Taxes calculated automatically at your local rate on every order',
      'Running table totals across multiple orders in a sitting',
      'Guests request the bill with one tap — servers see it immediately',
      'Clean subtotal / tax / total breakdowns on every receipt view',
    ],
  },
  {
    icon: Palette,
    title: 'Your restaurant, your brand',
    points: [
      'Your logo, accent color and story on every guest-facing page',
      'An elegant mobile menu that feels like your restaurant, not ours',
      'No app downloads and no guest sign-ups — scanning is enough',
      'Multi-tenant by design: your data is isolated and yours alone',
    ],
  },
]

const included = [
  'Unlimited menu items & categories',
  'Unlimited tables with printable QR codes',
  'Real-time orders board',
  'Full-screen kitchen display',
  'Guest "Call server" button',
  'One-tap bill requests',
  'Automatic tax calculation',
  'Staff order entry',
  'Sales overview & order history',
  'Custom branding & accent color',
  'Works on any phone — no app',
  'Secure guest sessions',
]

export default function Landing() {
  const { user, isAnonymous, profile, restaurant } = useAuth()
  const loggedIn = user && !isAnonymous

  const ctaTo = profile?.role === 'platform_admin' ? '/admin' : restaurant ? '/dashboard' : '/onboarding'

  return (
    <div className="min-h-[100dvh] bg-white text-stone-900">
      {/* ------------------------------------------------------------ nav -- */}
      <header className="sticky top-0 z-40 border-b border-stone-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <Store className="h-5 w-5" />
            </span>
            TableServe
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 md:flex">
            <a href="#efficiency" className="hover:text-stone-900">Why TableServe</a>
            <a href="#how" className="hover:text-stone-900">How it works</a>
            <a href="#features" className="hover:text-stone-900">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link to={ctaTo}>
                <Button size="sm">
                  Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="h-4 w-4" /> Log in
                  </Button>
                </Link>
                <Link to="/signup" className="hidden sm:block">
                  <Button size="sm">Get started free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero -- */}
      <section id="top" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(70% 55% at 50% -10%, rgba(239,68,68,.09), transparent 65%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand">
              <Zap className="h-3.5 w-3.5" /> QR ordering, live orders & billing — one platform
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Run a more efficient restaurant,
              <br className="hidden sm:block" /> one <span className="text-brand">QR code</span> at a time
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
              TableServe turns every table into a self-serve ordering point. Guests scan, browse
              your branded menu and order in under a minute — while your team watches everything
              flow through one live board, from first tap to final bill.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={loggedIn ? ctaTo : '/signup'} className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  {loggedIn ? 'Open your dashboard' : 'Set up your restaurant'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  <LogIn className="h-4 w-4" /> Log in
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-stone-400">
              No app for guests to install. No hardware to buy. Set up in an afternoon.
            </p>
          </div>

          {/* mockups */}
          <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr,auto]">
            {/* dashboard mockup */}
            <div className="hidden overflow-hidden rounded-2xl border border-stone-200 shadow-xl lg:block">
              <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="ml-3 text-xs text-stone-400">tableserve — live orders</span>
              </div>
              <div className="grid grid-cols-4 gap-3 bg-white p-4">
                {[
                  { t: 'Table 3', s: 'New', c: 'bg-blue-50 text-blue-700', items: ['2× Margherita Pizza', '1× Caesar Salad'] },
                  { t: 'Table 7', s: 'Preparing', c: 'bg-amber-50 text-amber-700', items: ['1× Truffle Pasta', '2× Garlic Bread'] },
                  { t: 'Table 1', s: 'Ready', c: 'bg-emerald-50 text-emerald-700', items: ['1× Grilled Salmon'] },
                  { t: 'Table 9', s: 'Served', c: 'bg-stone-100 text-stone-600', items: ['2× Tiramisu', '1× Espresso'] },
                ].map((o) => (
                  <div key={o.t} className="rounded-xl border border-stone-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{o.t}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.c}`}>{o.s}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {o.items.map((i) => (
                        <p key={i} className="text-xs text-stone-500">{i}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* phone mockup */}
            <div className="mx-auto w-full max-w-[280px]">
              <div className="rounded-[2.5rem] border-8 border-stone-900 bg-stone-900 shadow-2xl">
                <div className="overflow-hidden rounded-[2rem] bg-[#faf6ef]">
                  <div className="bg-stone-900 px-5 py-5 text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Italian</p>
                    <p className="font-display text-lg font-semibold">Bella Napoli</p>
                    <span className="mt-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-white/20">
                      Table 7
                    </span>
                  </div>
                  <div className="space-y-2.5 p-3.5">
                    {[
                      {
                        name: 'Margherita Pizza · $16',
                        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=96&h=96&fit=crop&q=60',
                      },
                      {
                        name: 'Penne Pomodoro · $19',
                        img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=96&h=96&fit=crop&q=60',
                      },
                      {
                        name: 'Tiramisu · $8',
                        img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=96&h=96&fit=crop&q=60',
                      },
                    ].map((x) => (
                      <div key={x.name} className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
                        <img
                          src={x.img}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <span className="text-xs font-medium text-stone-800">{x.name}</span>
                      </div>
                    ))}
                    <div className="rounded-xl bg-brand py-2.5 text-center text-xs font-semibold text-white">
                      Place order · $43.00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- efficiency -- */}
      <section id="efficiency" className="border-t border-stone-100 bg-[#faf6ef]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Built to make service <span className="text-brand">faster</span>
            </h2>
            <p className="mt-3 text-stone-600">
              Every part of TableServe removes a bottleneck between your guests, your kitchen and
              your floor staff.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {efficiencyPoints.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
                <div className="mb-3 inline-flex rounded-xl bg-red-50 p-2.5 text-brand">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ how -- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Live in three steps</h2>
          <p className="mt-3 text-stone-600">From signup to serving your first QR order in an afternoon.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-stone-100 p-6">
              <span className="font-display text-5xl font-semibold text-red-100">{s.n}</span>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- features -- */}
      <section id="features" className="border-t border-stone-100 bg-[#faf6ef]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Everything a busy floor needs
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {featureBlocks.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100 sm:p-7">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-brand">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold leading-snug">{b.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {b.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* included strip */}
          <div className="mt-12 rounded-2xl bg-stone-900 p-7 text-white sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-2xl font-semibold">Everything included</h3>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <QrCode className="h-4 w-4" /> One plan. No per-order fees.
              </div>
            </div>
            <div className="mt-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {included.map((x) => (
                <div key={x} className="flex items-center gap-2.5 text-sm text-white/85">
                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  {x}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ cta -- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand px-6 py-12 text-center text-white sm:px-12">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{ background: 'radial-gradient(80% 120% at 50% -20%, rgba(255,255,255,.18), transparent 60%)' }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Ready to serve smarter?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Create your restaurant, build your menu and print your first QR codes today.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={loggedIn ? ctaTo : '/signup'}>
                <Button size="lg" className="bg-white !text-stone-900 hover:bg-stone-100">
                  {loggedIn ? 'Open your dashboard' : 'Get started free'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="text-sm font-semibold text-white/90 underline-offset-4 hover:underline">
                or log in to your account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- footer -- */}
      <footer className="border-t border-stone-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <div>
            <div className="flex items-center gap-2 font-extrabold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white">
                <Store className="h-4 w-4" />
              </span>
              TableServe
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Scan. Order. Enjoy. — QR ordering for modern restaurants.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-stone-500">
            <a href="#efficiency" className="hover:text-stone-900">Why TableServe</a>
            <a href="#features" className="hover:text-stone-900">Features</a>
            <Link to="/login" className="hover:text-stone-900">Log in</Link>
            <Link to="/signup" className="font-semibold text-brand">Sign up</Link>
          </div>
        </div>
        <div className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} TableServe. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
