import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  QrCode,
  UtensilsCrossed,
  LayoutDashboard,
  ArrowRight,
  Receipt,
  Timer,
  ClipboardCheck,
  Users,
  BarChart3,
  Palette,
  Check,
  LogIn,
  Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'
import Logo from '../components/Logo'

const efficiencyPoints = [
  {
    icon: Timer,
    title: 'Turn tables faster',
    desc: 'Guests order the moment they sit down, with no waiting to flag someone for a menu, an order, or the bill. Every saved minute is a table served sooner.',
  },
  {
    icon: ClipboardCheck,
    title: 'Zero order-entry errors',
    desc: 'Orders go straight from the guest to the kitchen exactly as typed: items, modifiers, allergy notes. No misheard dishes, no handwriting to decipher.',
  },
  {
    icon: Users,
    title: 'Staff focus on hospitality',
    desc: 'Servers stop being order-takers. The "Call server" and "Request bill" buttons tell them exactly which table needs them, and why.',
  },
  {
    icon: BarChart3,
    title: 'Know your numbers',
    desc: 'A live overview of revenue, order volume and best-sellers, filterable by day, so you can staff, stock and price with facts, not guesses.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Build your menu',
    desc: 'Add categories, items, photos and modifiers in the dashboard. Toggle availability any time and 86 a dish in one tap.',
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
      'Orders grouped by table, updating in real time without a single refresh',
      'One-tap status changes with a full-screen kitchen display mode',
      'Staff can enter phone or walk-up orders from the same screen',
      'A chime alerts the floor when a guest calls a server',
    ],
  },
  {
    icon: UtensilsCrossed,
    title: 'A menu you can change in seconds, not print runs',
    points: [
      'Categories, photos, descriptions and prices, all edited live',
      'Modifier groups with price deltas: sizes, spice levels, add-ons',
      'Sold out? Toggle an item off and it vanishes from every table instantly',
      'Prices shown your way, in your currency and with your tax rate',
    ],
  },
  {
    icon: Receipt,
    title: 'Billing that adds up by itself',
    points: [
      'Taxes calculated automatically at your local rate on every order',
      'Running table totals across multiple orders in a sitting',
      'Guests request the bill with one tap and servers see it immediately',
      'Clean subtotal / tax / total breakdowns on every receipt view',
    ],
  },
  {
    icon: Palette,
    title: 'Your restaurant, your brand',
    points: [
      'Your logo, accent color and story on every guest-facing page',
      'An elegant mobile menu that feels like your restaurant, not ours',
      'No app downloads and no guest sign-ups. Scanning is enough',
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
  'Works on any phone, no app',
  'Secure guest sessions',
]

const plans = [
  {
    tier: 'Starter',
    price: 59,
    desc: 'Everything one venue needs to take orders.',
    features: [
      'Up to 10 tables (or 1 food truck)',
      'Unlimited menu, photos & modifiers',
      'Live orders board + kitchen display',
      'Checkout: cash/card, tips & split bills',
      'Dine-in, takeout & staff orders',
      'Email support',
    ],
    cta: 'Start free trial',
  },
  {
    tier: 'Pro',
    price: 79,
    desc: 'Everything in Starter, plus the growth engine.',
    features: [
      'Up to 40 tables',
      'Loyalty & rewards program + email list',
      'Full analytics & best-sellers',
      'Custom branding & multi-brand menus',
      'Priority support',
    ],
    cta: 'Start free trial',
    featured: true,
  },
  {
    tier: 'Premium',
    price: 99,
    desc: 'Everything in Pro, plus room to scale.',
    features: [
      'Unlimited tables & locations',
      'Cross-location analytics',
      'Dedicated support & onboarding',
      'Early access to new features',
      'White-label branding',
    ],
    cta: 'Start free trial',
  },
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
            <Logo className="h-8 w-8" />
            TableServe
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 md:flex">
            <a href="#efficiency" className="hover:text-stone-900">Why TableServe</a>
            <a href="#how" className="hover:text-stone-900">How it works</a>
            <a href="#features" className="hover:text-stone-900">Features</a>
            <a href="#pricing" className="hover:text-stone-900">Pricing</a>
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
                  <Button size="sm">Start free trial</Button>
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
              'radial-gradient(70% 55% at 50% -10%, rgba(180,83,9,.10), transparent 65%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(rgba(120,85,60,.13) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(75% 65% at 50% 15%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(75% 65% at 50% 15%, black, transparent)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
              <span className="h-px w-8 bg-brand/40" />
              QR ordering · Live orders · Billing
              <span className="h-px w-8 bg-brand/40" />
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Run a more efficient restaurant,
              <br className="hidden sm:block" /> one <span className="italic text-brand">QR code</span> at a time
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
              TableServe turns every table into a self-serve ordering point. Guests scan, browse
              your branded menu and order in under a minute, while your team watches everything
              flow through one live board, from first tap to final bill.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={loggedIn ? ctaTo : '/signup'} className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  {loggedIn ? 'Open your dashboard' : 'Start free trial'}
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
          <Reveal className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr,auto]">
            {/* dashboard mockup */}
            <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl lg:block">
              {/* browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="ml-4 flex-1 rounded-md bg-white px-3 py-1 text-center text-[11px] text-stone-400 ring-1 ring-stone-200">
                  tableserve-app.vercel.app/dashboard/orders
                </span>
                <span className="w-10" />
              </div>
              {/* board header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-base font-semibold text-stone-900">
                    Live orders
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-stone-400">
                  <span className="rounded-lg bg-stone-100 px-2 py-1 font-semibold text-stone-600">
                    12 open
                  </span>
                  <span className="rounded-lg bg-stone-100 px-2 py-1 font-semibold text-stone-600">
                    $612 today
                  </span>
                </div>
              </div>
              {/* order cards */}
              <div className="grid grid-cols-4 gap-3 bg-[#faf6ef] p-4">
                {[
                  {
                    t: 'Table 3', time: '12:42', s: 'New',
                    chip: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400',
                    btn: 'bg-blue-600 text-white', action: 'Start preparing',
                    items: [['2×', 'Margherita Pizza', '$32'], ['1×', 'Caesar Salad', '$12']],
                    total: '$49.72',
                  },
                  {
                    t: 'Table 7', time: '12:36', s: 'Preparing',
                    chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400',
                    btn: 'bg-amber-500 text-white', action: 'Mark ready',
                    items: [['1×', 'Penne Pomodoro', '$19'], ['2×', 'Garlic Bread', '$9']],
                    total: '$31.64',
                  },
                  {
                    t: 'Table 1', time: '12:31', s: 'Ready',
                    chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400',
                    btn: 'bg-emerald-600 text-white', action: 'Mark served',
                    items: [['1×', 'Grilled Salmon', '$21']],
                    total: '$23.73',
                  },
                  {
                    t: 'Table 9', time: '12:18', s: 'Served',
                    chip: 'bg-stone-200 text-stone-600', bar: 'bg-stone-300',
                    btn: 'bg-stone-700 text-white', action: 'Complete',
                    items: [['2×', 'Tiramisu', '$16'], ['1×', 'Espresso', '$4']],
                    total: '$22.60',
                  },
                ].map((o) => (
                  <div key={o.t} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-100">
                    <div className={`h-1 w-full ${o.bar}`} />
                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-stone-900">{o.t}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.chip}`}>
                          {o.s}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-stone-400">{o.time}</p>
                      <div className="mt-2 space-y-1 border-t border-stone-100 pt-2">
                        {o.items.map(([q, n, p]) => (
                          <div key={n} className="flex items-baseline gap-1.5 text-[11px]">
                            <span className="font-bold text-stone-700">{q}</span>
                            <span className="flex-1 truncate text-stone-600">{n}</span>
                            <span className="text-stone-400">{p}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-2 text-[11px]">
                        <span className="text-stone-400">Total incl. tax</span>
                        <span className="font-bold text-stone-900">{o.total}</span>
                      </div>
                      <div className={`mt-2.5 rounded-lg py-1.5 text-center text-[11px] font-semibold ${o.btn}`}>
                        {o.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* phone mockup with iPhone-like 9:19.5 proportions */}
            <div className="mx-auto w-full max-w-[270px]">
              <div className="rounded-[3rem] border-[10px] border-stone-900 bg-stone-900 shadow-2xl">
                <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.4rem] bg-[#faf6ef]">
                  {/* dynamic island */}
                  <div className="absolute left-1/2 top-2.5 z-10 h-[22px] w-24 -translate-x-1/2 rounded-full bg-black" />
                  <div className="bg-stone-900 px-5 pb-5 pt-11 text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Italian</p>
                    <p className="font-display text-lg font-semibold">Bella Napoli</p>
                    <span className="mt-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-white/20">
                      Table 7
                    </span>
                  </div>
                  <div className="flex-1 space-y-2.5 overflow-hidden p-3.5">
                    <p className="px-1 font-display text-sm font-semibold text-stone-900">Popular</p>
                    {[
                      {
                        name: 'Margherita Pizza',
                        price: '$16',
                        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=96&h=96&fit=crop&q=60',
                      },
                      {
                        name: 'Penne Pomodoro',
                        price: '$19',
                        img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=96&h=96&fit=crop&q=60',
                      },
                      {
                        name: 'Garden Salad',
                        price: '$12',
                        img: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=96&h=96&fit=crop&q=60',
                      },
                      {
                        name: 'Tiramisu',
                        price: '$8',
                        img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=96&h=96&fit=crop&q=60',
                      },
                    ].map((x) => (
                      <div key={x.name} className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
                        <img
                          src={x.img}
                          alt=""
                          loading="lazy"
                          className="h-11 w-11 rounded-lg object-cover"
                        />
                        <span className="flex-1 text-xs font-medium text-stone-800">{x.name}</span>
                        <span className="text-xs font-semibold text-stone-900">{x.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3.5 pt-0">
                    <div className="rounded-xl bg-brand py-3 text-center text-xs font-semibold text-white">
                      Place order · $55.00
                    </div>
                    <div className="mx-auto mt-2.5 h-1 w-24 rounded-full bg-stone-300" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- efficiency -- */}
      <section id="efficiency" className="border-t border-stone-100 bg-[#faf6ef]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
              Why TableServe
            </p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Built to make service <span className="italic text-brand">faster</span>
            </h2>
            <p className="mt-3 text-stone-600">
              Every part of TableServe removes a bottleneck between your guests, your kitchen and
              your floor staff.
            </p>
          </div>
          <Reveal className="mt-10 grid gap-5 sm:grid-cols-2">
            {efficiencyPoints.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100 transition duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 inline-flex rounded-xl bg-amber-50 p-2.5 text-brand">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ how -- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
            How it works
          </p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Live in three steps</h2>
          <p className="mt-3 text-stone-600">From signup to serving your first QR order in an afternoon.</p>
        </div>
        <Reveal className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-100 transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand font-display text-lg font-semibold text-white">
                  {s.n}
                </span>
                <h3 className="font-bold">{s.title}</h3>
              </div>
              <p className="mt-3.5 text-sm leading-relaxed text-stone-600">{s.desc}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ------------------------------------------------------- features -- */}
      <section id="features" className="border-t border-stone-100 bg-[#faf6ef]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
              Features
            </p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Everything a busy floor needs
            </h2>
          </div>
          <Reveal className="mt-10 grid gap-5 lg:grid-cols-2">
            {featureBlocks.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100 transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-7"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-brand">
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
          </Reveal>

          {/* included strip */}
          <div className="mt-12 rounded-2xl bg-stone-900 p-7 text-white sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-2xl font-semibold">Everything included</h3>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <QrCode className="h-4 w-4" /> Included in every plan. No per-order fees.
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

      {/* -------------------------------------------------------- pricing -- */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
            Pricing
          </p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Start free. Scale as you grow.
          </h2>
          <p className="mt-3 text-stone-600">
            Every plan starts with a <span className="font-semibold text-stone-900">14-day free trial</span>.
            No credit card required.
          </p>
        </div>
        <Reveal className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.tier}
              className={`relative flex flex-col rounded-3xl bg-white p-7 shadow-sm transition hover:-translate-y-1 ${
                p.featured ? 'ring-2 ring-brand' : 'ring-1 ring-stone-200'
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand px-4 py-1.5 text-[11px] font-extrabold text-white">
                  <Star className="h-3 w-3 fill-white" /> Most popular
                </span>
              )}
              <p className={`text-[13px] font-bold uppercase tracking-[0.2em] ${p.featured ? 'text-brand' : 'text-stone-400'}`}>
                {p.tier}
              </p>
              <p className="mt-3 font-display text-5xl font-semibold text-stone-900">
                <sup className="align-top text-2xl text-stone-400">$</sup>
                {p.price}
                <span className="ml-1 text-sm font-normal text-stone-400">/mo</span>
              </p>
              <p className="mb-6 mt-3 border-b border-stone-100 pb-6 text-sm text-stone-500">{p.desc}</p>
              <div className="space-y-2.5">
                {p.features.map((f) => (
                  <p key={f} className="flex items-center gap-2 text-sm text-stone-600">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> {f}
                  </p>
                ))}
              </div>
              <Link
                to="/signup"
                className={`mt-8 rounded-xl py-3 text-center text-sm font-bold transition ${
                  p.featured
                    ? 'bg-brand text-white hover:opacity-90'
                    : 'text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </Reveal>

        <div className="mx-auto mt-8 max-w-2xl space-y-1.5 text-center text-sm text-stone-500">
          <p>
            <span className="font-semibold text-stone-700">Running a food truck?</span> Flat $59/mo
            with the rewards program included.
          </p>
          <p className="text-xs text-stone-400">
            Prices in CAD. Your subscription is separate from card-processing fees — customers pay
            on your own terminal, and we never take a cut of your sales.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ cta -- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-6 py-14 text-center text-white sm:px-12">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(90% 120% at 50% -20%, rgba(180,83,9,.5), transparent 60%), radial-gradient(60% 80% at 100% 100%, rgba(180,83,9,.25), transparent 60%)',
            }}
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
                  {loggedIn ? 'Open your dashboard' : 'Start free trial'}
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
              <Logo className="h-7 w-7" />
              TableServe
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Scan. Order. Enjoy. QR ordering for modern restaurants.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-stone-500">
            <a href="#efficiency" className="hover:text-stone-900">Why TableServe</a>
            <a href="#features" className="hover:text-stone-900">Features</a>
            <Link to="/login" className="hover:text-stone-900">Log in</Link>
            <Link to="/signup" className="font-semibold text-brand">Sign up</Link>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 border-t border-stone-100 py-4 text-center text-xs text-stone-400 sm:flex-row sm:gap-4">
          <span>© {new Date().getFullYear()} TableServe. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-stone-600">Terms of Use</Link>
            <Link to="/privacy" className="hover:text-stone-600">Privacy Policy</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

/* Fades content up into view the first time it scrolls into the viewport. */
function Reveal({ children, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}>
      {children}
    </div>
  )
}
