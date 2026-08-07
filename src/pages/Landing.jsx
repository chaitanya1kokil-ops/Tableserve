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
  Map,
  Split,
  Gift,
  Printer,
  Truck,
  Pencil,
  ChefHat,
  ShoppingBag,
  Bell,
  Sparkles,
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
    desc: 'Servers stop being order-takers. The floor plan shows which table just ordered, which called someone over and which is waiting on its bill.',
  },
  {
    icon: BarChart3,
    title: 'Know your numbers',
    desc: 'Revenue, order volume, peak hours, best-sellers and busiest tables — so you can staff, stock and price with facts instead of guesses.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Build your menu',
    desc: 'Add categories, items, photos and modifiers in the dashboard. Mark dishes veg or non-veg, and 86 anything in one tap.',
  },
  {
    n: '2',
    title: 'Print your QR codes',
    desc: 'Every table gets its own QR code, generated automatically. Add a counter QR for the takeout line while you are at it.',
  },
  {
    n: '3',
    title: 'Serve and settle',
    desc: 'Orders land on the live board the second guests confirm. Staff move them New → Ready → Served, then settle the tab in Checkout.',
  },
]

// Deep-dive blocks, each paired with a mockup on the right.
const featureBlocks = [
  {
    icon: Map,
    eyebrow: 'Floor plan',
    title: 'Your dining room, live',
    desc: 'Arrange your tables the way they really sit, then read the whole room at a glance. Every dot carries its own state.',
    points: [
      'Drag tables into your real layout once — it stays put',
      'Badges for a new order, a guest seated, a server called, a bill requested',
      'Tap any table for its running tab, and edit or settle without leaving the map',
    ],
  },
  {
    icon: LayoutDashboard,
    eyebrow: 'Orders & kitchen',
    title: 'One board the whole team runs',
    desc: 'Orders stream in grouped by table and update in real time. No refresh, no shouting across the pass.',
    points: [
      'New → Ready → Served in one tap each, with a full-screen kitchen display',
      'Payment happens only in Checkout, so no table is ever closed unpaid',
      'A chime on the floor the moment a guest calls a server',
      'Staff can enter phone and walk-up orders from the same screen',
    ],
  },
  {
    icon: Split,
    eyebrow: 'Checkout',
    title: 'Split the bill, hassle-free',
    desc: 'The part of service that always slows a table down, done in a few taps.',
    points: [
      'Split evenly, or assign individual dishes to each payer',
      'Collect from each person separately — cash, card or other, with tips',
      'A tab only closes once every payer has actually settled',
      'Tax worked out automatically at your local rate on every order',
    ],
  },
  {
    icon: UtensilsCrossed,
    eyebrow: 'Menu',
    title: 'Item sold out? Mark it unavailable',
    desc: 'Availability, prices, photos and modifiers — all edited live, and every table sees it straight away.',
    points: [
      'Categories, photos, descriptions and prices, all edited live',
      'Modifier groups with price deltas: sizes, spice levels, add-ons',
      'Veg and non-veg marks guests recognise instantly',
      'Once it is marked unavailable, it disappears from every guest\u2019s menu',
    ],
  },
]

// Smaller capability cards under the deep dives.
const moreFeatures = [
  {
    icon: Gift,
    title: 'Loyalty & rewards',
    desc: 'Guests join with an email, visits count automatically once per sitting, and every Nth visit earns a free item you choose. Doubles as your mailing list.',
    plan: 'Pro',
  },
  {
    icon: ShoppingBag,
    title: 'Counter QR for takeout',
    desc: 'A register QR for the queue at the till. Guests order by name, takeout is forced, and you can attach an online payment link.',
    plan: 'Pro',
  },
  {
    icon: Printer,
    title: 'Kitchen ticket printing',
    desc: 'Tickets print themselves the moment an order lands, through Star CloudPRNT or PrintNode. Nothing waits on someone watching a screen.',
    plan: 'Pro',
  },
  {
    icon: Pencil,
    title: 'Edit an order after it goes out',
    desc: 'A returned dish or a late addition, corrected on the spot — from the floor plan or from Checkout, with the totals recalculated for you.',
  },
  {
    icon: Palette,
    title: 'Multi-brand menus',
    desc: 'Running two kitchens under one roof? Give each its own logo and categories, and guests pick a brand before they browse.',
    plan: 'Pro',
  },
  {
    icon: Star,
    title: 'Google reviews, asked at the right time',
    desc: 'A review button on your menu while the meal is still fresh, pointing straight at your Google listing.',
    plan: 'Pro',
  },
  {
    icon: Truck,
    title: 'Food truck mode',
    desc: 'One QR, order by name, paid online before the kitchen sees it. Flat $79/mo with rewards included.',
  },
  {
    icon: BarChart3,
    title: 'Analytics that answer questions',
    desc: 'Revenue, orders, average order and items sold over 7, 30 or 90 days — plus peak hours, top items, busiest tables and your cash/card split.',
  },
]

// The whole Starter feature set, grouped into four things you can read in a
// glance instead of a twelve-line list.
const everyPlanGroups = [
  {
    icon: QrCode,
    title: 'QR ordering',
    desc: 'Unlimited menu, photos, modifiers and veg marks. A printable code for every table.',
  },
  {
    icon: LayoutDashboard,
    title: 'Floor & kitchen',
    desc: 'Live floor plan, real-time orders board, full-screen kitchen display, server calls.',
  },
  {
    icon: Split,
    title: 'Checkout',
    desc: 'Cash, card, tips and split bills, with tax worked out on every order.',
  },
  {
    icon: Palette,
    title: 'Your brand',
    desc: 'Your logo and colours on every guest page — and no app for anyone to install.',
  },
]

// …and these five are the only features a paid tier unlocks.
const proUnlocks = [
  { icon: Gift, label: 'Loyalty & rewards' },
  { icon: Palette, label: 'Multi-brand menus' },
  { icon: ShoppingBag, label: 'Counter QR + payment link' },
  { icon: Printer, label: 'Kitchen auto-printing' },
  { icon: Star, label: 'Google review button' },
]

// Table capacity, drawn as a scale rather than another bullet list.
const tableScale = [
  { tier: 'Starter', n: '10', w: '25%' },
  { tier: 'Pro', n: '40', w: '62%' },
  { tier: 'Premium', n: 'Unlimited', w: '100%' },
]

const plans = [
  {
    tier: 'Starter',
    price: 99,
    desc: 'Everything one venue needs to take orders.',
    features: [
      'Up to 10 tables',
      'QR menu — dine-in & takeout',
      'Live floor plan, orders board & kitchen display',
      'Checkout: cash/card, tips & split bills',
      'Menu, modifiers & category ordering',
      'Email support',
    ],
    cta: 'Start free trial',
  },
  {
    tier: 'Pro',
    price: 179,
    desc: 'Everything in Starter, plus the growth engine.',
    features: [
      'Up to 40 tables',
      'Loyalty & rewards program + email list',
      'Multi-brand menus with logos',
      'Counter QR + online payment links',
      'Kitchen auto-printing & Google reviews',
      'Full analytics & staff PIN roles',
      'Priority support',
    ],
    cta: 'Start free trial',
    featured: true,
  },
  {
    tier: 'Premium',
    price: 299,
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
    /* The page is one long warm gradient — espresso at the top, caramel
       through the middle transitions, cream where the product is shown, and
       back to espresso to close. Every section starts on the exact colour the
       previous one ended, so nothing ever cuts. */
    <div className="min-h-[100dvh] bg-[#0b0807]">
      {/* ------------------------------------------------------------ nav -- */}
      {/* Mostly see-through, leaning on a heavier blur to keep the links
          legible over both the dark top of the page and the cream middle. */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0b0807]/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="flex items-center gap-2 font-extrabold text-white">
            <Logo className="h-8 w-8" />
            TableServe
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/70 md:flex">
            <a href="#efficiency" className="transition hover:text-white">Why TableServe</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
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
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Log in
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
      <section
        id="top"
        className="ts-grain relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(180deg,#0b0807 0%,#120d0a 55%,#1b120d 100%)' }}
      >
        <div
          className="ts-aurora pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(75% 60% at 50% -15%, rgba(217,119,6,.38), transparent 62%), radial-gradient(50% 60% at 110% 10%, rgba(180,83,9,.26), transparent 60%), radial-gradient(45% 50% at -10% 40%, rgba(120,53,15,.28), transparent 65%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(80% 60% at 50% 10%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(80% 60% at 50% 10%, black, transparent)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="ts-rise flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-300/90" style={{ '--d': '.05s' }}>
              <span className="h-px w-8 bg-amber-300/30" />
              QR ordering · Live floor · Checkout
              <span className="h-px w-8 bg-amber-300/30" />
            </p>
            <h1 className="ts-rise mt-5 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ '--d': '.14s' }}>
              Run your whole floor
              <br className="hidden sm:block" /> from{' '}
              <span className="relative inline-block italic text-amber-400">
                one screen
                <span
                  aria-hidden="true"
                  className="absolute -inset-x-3 -inset-y-1 -z-10 rounded-full opacity-70 blur-2xl"
                  style={{ background: 'radial-gradient(60% 70% at 50% 50%, rgba(245,158,11,.45), transparent 70%)' }}
                />
              </span>
            </h1>
            <p className="ts-rise mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/70" style={{ '--d': '.26s' }}>
              Guests scan, browse your branded menu and order in under a minute. Your team watches
              every table on a live floor plan, sends tickets to the kitchen, and splits the bill
              without a calculator — all from the same place.
            </p>
            <div className="ts-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ '--d': '.36s' }}>
              <Link to={loggedIn ? ctaTo : '/signup'} className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  {loggedIn ? 'Open your dashboard' : 'Start free trial'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full !border-white/25 !bg-white/5 !text-white hover:!bg-white/15"
                >
                  <LogIn className="h-4 w-4" /> Log in
                </Button>
              </Link>
            </div>
            <p className="ts-rise mt-4 text-xs text-white/45" style={{ '--d': '.46s' }}>
              14-day free trial · No app for guests to install · No hardware to buy
            </p>
          </div>

          {/* The product demonstrating itself: the guest's order lands on the
              staff board a beat later, then goes Ready. Loops. */}
          <LiveDemo />
        </div>

        {/* trust strip */}
        <div className="relative border-t border-white/10">
          <div className="ts-rise mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 sm:grid-cols-4" style={{ '--d': '.7s' }}>
            {[
              ['0%', 'commission on your sales'],
              ['60s', 'from scan to order placed'],
              ['1', 'screen for the whole floor'],
              ['0', 'apps for guests to download'],
            ].map(([big, small]) => (
              <div key={small} className="py-6 text-center">
                <p className="font-display text-2xl font-semibold text-amber-400">{big}</p>
                <p className="mt-1 text-[11px] leading-tight text-white/50">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------- efficiency (still dark) -- */}
      <section
        id="efficiency"
        className="ts-grain relative text-white"
        style={{ background: 'linear-gradient(180deg,#1b120d 0%,#2a1a12 55%,#3d2317 100%)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 70% at 50% 0%, rgba(217,119,6,.20), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:pb-12 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/90">
              Why TableServe
            </p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Built to make service <span className="italic text-amber-400">faster</span>
            </h2>
            <p className="mt-3 text-white/60">
              Every part of TableServe removes a bottleneck between your guests, your kitchen and
              your floor staff.
            </p>
          </div>
          <Reveal className="ts-stagger mt-10 grid gap-5 sm:grid-cols-2">
            {efficiencyPoints.map((f) => (
              <div
                key={f.title}
                className="ts-card rounded-2xl bg-white/[0.045] p-6 ring-1 ring-white/10 backdrop-blur-sm"
              >
                <div className="mb-3 inline-flex rounded-xl bg-amber-400/10 p-2.5 text-amber-400 ring-1 ring-amber-400/20">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{f.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---- the light half ----------------------------------------------
          There is no separate transition band any more: the sunrise is an
          overlay on THIS block that fades to fully transparent, so the ramp
          has no bottom edge to see. "Live in three steps" sits inside it. */}
      <div
        /* ts-grain on every full-width block: the noise lightens whatever it
           covers, so a block without it starts visibly darker than its
           neighbour and the join shows up as a line. */
        className="ts-grain relative"
        style={{
          // BOTH ramps live on this one block — the sunrise pinned to its top,
          // the sunset pinned to its bottom. That way the block below starts
          // already at #0b0807, the same near-black as the page background, so
          // the join between the two elements lands where a one-pixel
          // difference is invisible instead of in the middle of bright cream.
          backgroundImage:
            // sunrise: eases in, gone by ~510px
            'linear-gradient(180deg,#3d2317 0px,#412718 45px,#4e2d1a 95px,#6a3b20 155px,' +
            '#95582b 215px,#bd8145 275px,rgba(212,167,114,.86) 330px,' +
            'rgba(234,207,169,.58) 390px,rgba(247,234,214,.28) 445px,' +
            'rgba(253,247,236,0) 510px),' +
            // sunset: starts from nothing, all the way down to the page black
            'linear-gradient(180deg,rgba(244,228,205,0) 0px,rgba(241,223,195,.5) 45px,' +
            '#e2c193 105px,#b57c40 165px,#7a4a26 225px,#3d2317 285px,' +
            '#1a110b 350px,#0b0807 420px,#0b0807 545px),' +
            // the cream beneath them both
            'linear-gradient(180deg,#fdf7ec 0%,#fffdf9 18%,#fefaf3 42%,#fdf6ea 70%,#f8ecd6 92%,#f4e4cd 100%)',
          backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
          backgroundPosition: 'top, bottom, top',
          backgroundSize: '100% 510px, 100% 545px, 100% 100%',
        }}
      >
        {/* soft pools of peach and honey so the cream is never a flat wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(30% 12% at 82% 8%, rgba(251,191,120,.20), transparent 70%),' +
              'radial-gradient(34% 12% at 14% 34%, rgba(244,164,140,.16), transparent 72%),' +
              'radial-gradient(30% 12% at 88% 62%, rgba(251,191,120,.17), transparent 70%),' +
              'radial-gradient(36% 13% at 18% 88%, rgba(230,150,110,.14), transparent 72%)',
          }}
        />

      {/* ------------------------------------------------------------ how -- */}
      {/* Sits inside the sunrise: the heading is still in the warm brown (so it
          is set in light type) and the cards land as the ramp reaches cream. */}
      <section id="how" className="relative mx-auto max-w-6xl px-5 pb-16 pt-[8.5rem] sm:pb-20 sm:pt-[10rem]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-200/90">
            How it works
          </p>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Live in three steps
          </h2>
          <p className="mt-3 text-white/70">From signup to serving your first QR order in an afternoon.</p>
        </div>
        <Reveal className="ts-stagger mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative ts-card rounded-3xl bg-white p-7 shadow-[0_2px_20px_-8px_rgba(120,72,30,.25)] ring-1 ring-amber-900/[0.07]"
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

      {/* ------------------------------------------------- feature deep dives -- */}
      <section id="features" className="relative">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700">
              Features
            </p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Everything a busy floor needs
            </h2>
            <p className="mt-3 text-stone-600">
              Not a menu with a shopping cart bolted on — the tools your team actually reaches for
              during a rush.
            </p>
          </div>

          <div className="mt-14 space-y-16 sm:space-y-20">
            {featureBlocks.map((b, i) => (
              <Reveal
                key={b.title}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
              >
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-900/10">
                      <b.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
                      {b.eyebrow}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-semibold leading-snug sm:text-3xl">
                    {b.title}
                  </h3>
                  <p className="mt-3 text-stone-600">{b.desc}</p>
                  <ul className="mt-5 space-y-2.5">
                    {b.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm text-stone-700">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                  {i === 0 && <FloorMockup />}
                  {i === 1 && <KitchenMockup />}
                  {i === 2 && <SplitMockup />}
                  {i === 3 && <MenuEditMockup />}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- more features -- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700">
            And more
          </p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            The rest of the toolkit
          </h2>
        </div>
        <Reveal className="ts-stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {moreFeatures.map((f) => (
            <div
              key={f.title}
              className="ts-card flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(120,72,30,.25)] ring-1 ring-amber-900/[0.07]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex rounded-xl bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-900/[0.06]">
                  <f.icon className="h-5 w-5" />
                </span>
                {f.plan && (
                  <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {f.plan}
                  </span>
                )}
              </div>
              <h3 className="font-bold leading-snug text-stone-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.desc}</p>
            </div>
          ))}
        </Reveal>

        {/* What every plan gets — written as a statement, not two bullet lists. */}
        <Reveal className="relative mt-16 overflow-hidden rounded-[1.75rem] text-white shadow-[0_34px_90px_-34px_rgba(60,28,8,.65)] sm:rounded-[2.25rem]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(155deg,#432a19 0%,#241710 45%,#140c07 100%)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(55% 60% at 12% -5%, rgba(217,119,6,.34), transparent 62%),' +
                'radial-gradient(45% 55% at 95% 100%, rgba(180,83,9,.22), transparent 65%)',
            }}
          />

          <div className="relative px-6 py-10 sm:px-12 sm:py-14">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/90">
                What you get
              </p>
              <h3 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                The whole system, on <span className="italic text-amber-400">every</span> plan
              </h3>
              <p className="mt-3.5 leading-relaxed text-white/55">
                Starter is not a stripped-back tier. You pay more only for scale and the
                growth tools.
              </p>
            </div>

            {/* four groups, not twelve lines */}
            <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {everyPlanGroups.map((g) => (
                <div key={g.title} className="flex gap-4">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20">
                    <g.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold leading-snug">{g.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* capacity, as a scale you can read at a glance */}
            <div className="mt-9 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
                Tables by plan
              </p>
              <div className="mt-4 space-y-3">
                {tableScale.map((t) => (
                  <div key={t.tier} className="flex items-center gap-3 sm:gap-4">
                    <span className="w-16 flex-shrink-0 text-xs text-white/55 sm:w-20">{t.tier}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: t.w,
                          background: 'linear-gradient(90deg,#b45309,#f59e0b)',
                        }}
                      />
                    </span>
                    <span className="w-16 flex-shrink-0 text-right text-xs font-bold sm:w-20">
                      {t.n}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* the five paid unlocks, as chips rather than another list */}
            <div className="mt-9 border-t border-white/10 pt-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                <span className="inline-flex items-center gap-2 pr-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/90">
                  <Sparkles className="h-3.5 w-3.5" /> Unlocks with Pro
                </span>
                {proUnlocks.map((u) => (
                  <span
                    key={u.label}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3.5 py-1.5 text-sm text-amber-50 ring-1 ring-amber-400/25"
                  >
                    <u.icon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                    {u.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm text-white/45">
              <QrCode className="h-4 w-4 flex-shrink-0" />
              No per-order fees and no commission on your sales, on any plan.
            </div>
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------- pricing -- */}
      <section id="pricing" className="relative">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:pb-12 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700">
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
          <Reveal className="ts-stagger mt-12 grid items-stretch gap-5 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.tier}
                className={`ts-card relative flex flex-col rounded-3xl bg-white p-7 ${
                  p.featured
                    ? 'shadow-[0_18px_50px_-18px_rgba(146,64,14,.45)] ring-2 ring-amber-600'
                    : 'shadow-[0_2px_20px_-8px_rgba(120,72,30,.25)] ring-1 ring-amber-900/[0.07]'
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-700 px-4 py-1.5 text-[11px] font-extrabold text-white">
                    <Star className="h-3 w-3 fill-white" /> Most popular
                  </span>
                )}
                <p className={`text-[13px] font-bold uppercase tracking-[0.2em] ${p.featured ? 'text-amber-700' : 'text-stone-400'}`}>
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
                      ? 'bg-amber-700 text-white hover:bg-amber-800'
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
              <span className="font-semibold text-stone-700">Running a food truck?</span> Flat $79/mo
              with the rewards program included.
            </p>
            <p className="text-xs text-stone-400">
              Prices in CAD. Your subscription is separate from card-processing fees — customers pay
              on your own terminal, and we never take a cut of your sales.
            </p>
          </div>
        </div>
      </section>
        {/* ---------------------------------------------------------- cta -- */}
        {/* Sits in the sunset, the way "Live in three steps" sits in the
            sunrise — so the fade is filled with content, not empty space. */}
        <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-[6rem] text-center text-white sm:pb-28 sm:pt-[7rem]">
          <h2 className="font-display text-3xl font-semibold sm:text-5xl">
            Ready to serve smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Create your restaurant, build your menu and print your first QR codes today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={loggedIn ? ctaTo : '/signup'}>
              <Button size="lg" className="bg-white !text-stone-900 hover:bg-stone-100">
                {loggedIn ? 'Open your dashboard' : 'Start free trial'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login" className="text-sm font-semibold text-white/80 underline-offset-4 hover:underline">
              or log in to your account
            </Link>
          </div>
          <p className="mt-5 text-xs text-white/35">
            14-day free trial · No credit card required
          </p>
        </section>

      </div>
      {/* ==================== end of the light half ======================= */}

      {/* ---- the closing dark half -----------------------------------------
          Same trick as the sunrise: no separate band. The sunset is an overlay
          on THIS block that starts as the cream above it and fades out to
          nothing, so there is no edge where a band would have stopped. */}
      <div
        /* -mt-px: fractional layout heights can leave a sub-pixel gap between
           blocks, and the near-black page background shows through it as a
           1px line. Overlapping by one pixel removes it. */
        /* The sunset already finished on the block above, so this one simply
           starts at the page black — the join is black-on-black. */
        className="ts-grain relative -mt-px overflow-hidden bg-[#0b0807] text-white"
      >
        <div
          aria-hidden="true"
          className="ts-aurora pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(75% 85% at 50% 18%, rgba(217,119,6,.28), transparent 64%), radial-gradient(50% 60% at 100% 100%, rgba(180,83,9,.16), transparent 65%)',
          }}
        />

      {/* --------------------------------------------------------- footer -- */}
      <footer className="relative border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 font-extrabold">
              <Logo className="h-7 w-7" />
              TableServe
            </div>
            {/* No CTA button here — the call to action sits directly above
                the footer, so a second one would just repeat it. */}
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              QR ordering that runs the whole floor — scan to order, straight to the kitchen, paid
              at the table. No commission, ever.
            </p>
          </div>

          <FooterCol title="Product">
            <a href="#efficiency" className="hover:text-white">Why TableServe</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
          </FooterCol>

          <FooterCol title="Company">
            <Link to="/contact" className="hover:text-white">Contact us</Link>
            <Link to="/login" className="hover:text-white">Log in</Link>
            <Link to="/signup" className="hover:text-white">Create an account</Link>
          </FooterCol>

          <FooterCol title="Legal">
            <Link to="/terms" className="hover:text-white">Terms of Use</Link>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
          </FooterCol>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-xs text-white/35 sm:flex-row">
            <span>© {new Date().getFullYear()} TableServe. All rights reserved.</span>
            <span>Built for restaurants in Toronto and beyond.</span>
          </div>
        </div>
      </footer>
      </div>
      {/* ================== end of the closing dark half ================== */}
    </div>
  )
}

/* ============================================================= motion == */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/* Phases: 0 browsing · 1 placing · 2 order on the board · 3 marked ready. */
const PHASE_MS = [2000, 900, 2400, 2600]

function useDemoLoop(paused) {
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (reduced) {
      setPhase(3) // show the finished state, no motion
      return
    }
    if (paused) return
    let timer
    const step = (i) => {
      timer = setTimeout(() => {
        const next = (i + 1) % PHASE_MS.length
        setPhase(next)
        step(next)
      }, PHASE_MS[i])
    }
    setPhase(0)
    step(0)
    return () => clearTimeout(timer)
  }, [reduced, paused])

  return phase
}

/* Pauses the demo while it is off-screen so it is not animating unseen. */
function useOnScreen(ref) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

/* Straightens the perspective tilt once the mockup scrolls into view. */
function useFlattenOnView() {
  const ref = useRef(null)
  const [flat, setFlat] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setFlat(true)
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, flat]
}

function LiveDemo() {
  const hostRef = useRef(null)
  const onScreen = useOnScreen(hostRef)
  const phase = useDemoLoop(!onScreen)
  const [tiltRef, flat] = useFlattenOnView()

  return (
    <div ref={hostRef} className="ts-rise relative mt-14" style={{ '--d': '.56s' }}>
      {/* warm glow pooling under the mockups */}
      <div
        aria-hidden="true"
        /* deliberately overshoots the container: a blurred box with a hard
           bottom edge leaves a visible horizontal cut across the hero */
        className="pointer-events-none absolute -inset-x-10 -top-10 -bottom-28"
        style={{
          background:
            'radial-gradient(55% 50% at 45% 50%, rgba(217,119,6,.22), transparent 72%)',
          filter: 'blur(24px)',
        }}
      />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr,auto]">
        <div ref={tiltRef} className={`ts-tilt ${flat ? 'ts-tilt-flat' : ''} hidden lg:block`}>
          <BoardMockup phase={phase} />
        </div>
        <PhoneMockup phase={phase} />
      </div>
      <p className="relative mt-6 text-center text-xs text-white/35">
        A real order, start to finish — this is the actual interface.
      </p>
    </div>
  )
}

/* =========================================================== mockups == */
/* Static illustrations of the real UI. Kept in sync with the product:
   staff advance orders New → Ready → Served, and payment happens only in
   Checkout — there is no "start preparing" step and no paying from the board. */

/* One dish set shared by every mockup, so the phone, the board, the kitchen
   and the menu editor all show the same restaurant. */
const unsplash = (id, w = 120) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&fit=crop&q=60`

const DISH = {
  butterChicken: unsplash('1631452180519-c014fe946bc7'),
  paneerTikka: unsplash('1567188040759-fb8a883dc6d8'),
  biryani: unsplash('1589302168068-964664d93dc0'),
  samosa: unsplash('1601050690597-df0568f70950'),
  chana: unsplash('1585937421612-70a008356fbe'),
}

function BrowserChrome({ path }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
      <span className="ml-4 flex-1 rounded-md bg-white px-3 py-1 text-center text-[11px] text-stone-400 ring-1 ring-stone-200">
        tableserve.ca{path}
      </span>
      <span className="w-10" />
    </div>
  )
}

const STATIC_ORDERS = [
  {
    t: 'Table 7', time: '12:36', s: 'New',
    chip: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500',
    btn: 'bg-blue-600 text-white', action: 'Mark ready',
    items: [['1×', 'Paneer Tikka', '$19'], ['2×', 'Masala Chai', '$8']],
    total: '$30.51',
  },
  {
    t: 'Table 1', time: '12:31', s: 'Ready',
    chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500',
    btn: 'bg-emerald-600 text-white', action: 'Mark served',
    items: [['1×', 'Lamb Biryani', '$22']],
    total: '$23.73',
  },
  {
    t: 'Table 9', time: '12:18', s: 'Served',
    chip: 'bg-stone-200 text-stone-600', bar: 'bg-stone-300',
    btn: 'bg-white text-stone-600 ring-1 ring-stone-200', action: 'Settle in Checkout',
    items: [['2×', 'Samosa Chaat', '$18'], ['1×', 'Masala Chai', '$4']],
    total: '$22.60',
  },
]

function OrderCard({ o, fresh }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-100 ${
        fresh ? 'ts-drop-in' : ''
      }`}
    >
      <div className={`h-1 w-full ${o.bar}`} />
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-stone-900">{o.t}</span>
          <span key={o.s} className={`ts-flip rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.chip}`}>
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
  )
}

function BoardMockup({ phase = 3 }) {
  const landed = phase >= 2 // the demo order is on the board
  const ready = phase === 3

  // The order the guest places on the phone, as staff see it.
  const demo = {
    t: 'Table 3',
    time: '12:42',
    s: ready ? 'Ready' : 'New',
    chip: ready ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700',
    bar: ready ? 'bg-emerald-500' : 'bg-blue-500',
    btn: ready ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white',
    action: ready ? 'Mark served' : 'Mark ready',
    items: [['2×', 'Butter Chicken', '$38'], ['1×', 'Garlic Naan', '$5']],
    total: '$48.59',
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
      {/* one slow light sweep, so the surface reads as glass */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div className="ts-sheen absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      </div>
      <BrowserChrome path="/dashboard/orders" />
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-semibold text-stone-900">Live orders</span>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <span
            key={landed ? 'in' : 'out'}
            className={`ts-flip rounded-lg px-2 py-1 font-semibold ${
              landed ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {landed ? '12 open' : '11 open'}
          </span>
          <span className="rounded-lg bg-stone-100 px-2 py-1 font-semibold text-stone-600">$612 today</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 bg-[#faf6ef] p-4">
        {landed ? (
          <div className="relative">
            {phase === 2 && (
              <span
                aria-hidden="true"
                className="ts-ping-ring pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-blue-400"
              />
            )}
            <OrderCard o={demo} fresh={phase === 2} />
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-stone-200/80 p-3 text-center">
            <span className="text-[10px] leading-tight text-stone-300">Waiting on<br />the next order</span>
          </div>
        )}
        {STATIC_ORDERS.map((o) => (
          <OrderCard key={o.t} o={o} />
        ))}
      </div>
    </div>
  )
}

/* The guest's phone: brand header, the "order in progress" card a returning
   guest sees, diet marks and the cart bar. */
function PhoneMockup({ phase = 3 }) {
  const items = [
    { name: 'Butter Chicken', price: '$19', diet: 'non-veg', img: DISH.butterChicken },
    { name: 'Paneer Tikka', price: '$16', diet: 'veg', img: DISH.paneerTikka },
    { name: 'Lamb Biryani', price: '$22', diet: 'non-veg', img: DISH.biryani },
    { name: 'Samosa Chaat', price: '$9', diet: 'veg', img: DISH.samosa },
  ]
  const placing = phase === 1
  const sent = phase >= 2
  const ready = phase === 3

  return (
    <div className="ts-float mx-auto w-full max-w-[270px]">
      <div className="rounded-[3rem] border-[10px] border-stone-800 bg-stone-800 shadow-2xl">
        <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.4rem] bg-[#faf6ef]">
          <div className="absolute left-1/2 top-2.5 z-10 h-[22px] w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="relative overflow-hidden bg-stone-900 px-5 pb-4 pt-11 text-white">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(120% 90% at 85% -10%, rgba(217,119,6,.45), transparent 60%)' }}
            />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Indian · Street food</p>
              <p className="font-display text-lg font-semibold">Royal Spice</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-white/20">
                  <UtensilsCrossed className="h-2.5 w-2.5" /> Table 3
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-stone-900">
                  <Bell className="h-2.5 w-2.5" /> Call server
                </span>
              </div>
            </div>
          </div>
          {/* Tracking card — appears the moment the order is sent, and flips
              to "ready" when the kitchen marks it. */}
          <div className="h-[52px] px-3 pt-2.5">
            {sent && (
              <div
                key={ready ? 'ready' : 'sent'}
                className={`ts-drop-in flex items-center gap-2 rounded-xl px-2.5 py-2 shadow-sm ring-1 ${
                  ready ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-black/5'
                }`}
              >
                <span
                  className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-white ${
                    ready ? 'bg-emerald-600' : 'bg-brand'
                  }`}
                >
                  {ready ? <Check className="h-3 w-3" /> : <Receipt className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[10px] font-bold text-stone-900">
                    {ready ? 'Your order is ready' : 'Order sent to the kitchen'}
                  </span>
                  <span className="block text-[9px] text-stone-500">
                    {ready ? 'Table 3 · being brought over' : '$48.59 · tap to track'}
                  </span>
                </span>
                <ArrowRight className="h-3 w-3 flex-shrink-0 text-stone-400" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-hidden p-3">
            <p className="px-1 font-display text-sm font-semibold text-stone-900">Popular</p>
            {items.map((x) => (
              <div key={x.name} className="flex items-center gap-2.5 rounded-xl bg-white p-2 shadow-sm">
                <img
                  src={x.img}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 flex-shrink-0 rounded-lg bg-stone-100 object-cover"
                />
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <MiniDiet diet={x.diet} />
                  <span className="truncate text-[11px] font-medium text-stone-800">{x.name}</span>
                </span>
                <span className="text-[11px] font-semibold text-stone-900">{x.price}</span>
              </div>
            ))}
          </div>
          <div className="p-3 pt-0">
            <div
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-xs font-semibold text-white transition-all duration-300 ${
                sent ? 'bg-emerald-600' : 'bg-brand'
              } ${placing ? 'scale-[0.96] opacity-90' : 'scale-100'}`}
            >
              {sent ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Order placed
                </>
              ) : placing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Placing…
                </>
              ) : (
                'Place order · $48.59'
              )}
            </div>
            <div className="mx-auto mt-2.5 h-1 w-24 rounded-full bg-stone-300" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* The veg / non-veg mark used on the real menu. */
function MiniDiet({ diet }) {
  const color = diet === 'veg' ? '#16a34a' : '#dc2626'
  return (
    <span
      className="inline-grid h-2.5 w-2.5 flex-shrink-0 place-items-center rounded-[2px] border bg-white"
      style={{ borderColor: color }}
    >
      <span className="h-[4px] w-[4px] rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

const FLOOR_BADGES = {
  new: { cls: 'bg-emerald-600 text-white', icon: ShoppingBag, halo: 'ring-emerald-300/70' },
  here: { cls: 'bg-sky-500 text-white', icon: Users, halo: 'ring-sky-300/70' },
  called: { cls: 'bg-orange-500 text-white', icon: Bell, halo: 'ring-orange-300/80' },
  bill: { cls: 'bg-white text-orange-600 ring-1 ring-orange-200', icon: Receipt, halo: 'ring-orange-200/70' },
}

/* Square rounded tables, exactly as the dashboard draws them (Floor.jsx uses
   rounded-xl tiles with the table's label inside), with chairs added around
   each so the plan reads as a dining room. */
const FLOOR_STATE = {
  active: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400',
  served: 'bg-amber-100 text-amber-900 ring-1 ring-amber-400',
  free: 'bg-white text-stone-600 ring-1 ring-stone-200',
}

function FloorTable({ label, seats = 4, state = 'free', badge, d = 46 }) {
  const pad = 15
  const box = d + pad * 2
  const b = badge ? FLOOR_BADGES[badge] : null
  // Chairs sit against the flat sides of a square table, not on a circle.
  const spots =
    seats === 2
      ? [
          { x: pad / 2, y: box / 2, w: 8, h: 16 },
          { x: box - pad / 2, y: box / 2, w: 8, h: 16 },
        ]
      : [
          { x: box / 2, y: pad / 2, w: 16, h: 8 },
          { x: box / 2, y: box - pad / 2, w: 16, h: 8 },
          { x: pad / 2, y: box / 2, w: 8, h: 16 },
          { x: box - pad / 2, y: box / 2, w: 8, h: 16 },
        ]

  return (
    <div className="relative flex-shrink-0" style={{ width: box, height: box }}>
      {spots.map((c, i) => (
        <span
          key={i}
          className="absolute rounded-[3px] bg-stone-400/30"
          style={{ left: c.x, top: c.y, width: c.w, height: c.h, transform: 'translate(-50%, -50%)' }}
        />
      ))}
      <span
        className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl font-bold shadow-[0_3px_10px_rgba(80,52,25,.16)] ${FLOOR_STATE[state]}`}
        style={{ width: d, height: d, fontSize: 10, lineHeight: 1.1 }}
      >
        <span className="px-1 text-center">{label}</span>
      </span>
      {b && (
        <span
          className={`absolute grid h-[16px] w-[16px] place-items-center rounded-full shadow-sm ring-2 ring-white ${b.cls}`}
          style={{ left: box / 2 + d / 2 - 3, top: box / 2 - d / 2 - 3 }}
        >
          <b.icon className="h-2 w-2" />
        </span>
      )}
    </div>
  )
}

function FloorMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
      <BrowserChrome path="/dashboard/floor" />
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
        <span className="font-display text-sm font-semibold text-stone-900">Floor plan</span>
        {/* same legend the dashboard shows */}
        <div className="flex items-center gap-2.5 text-[10px] font-medium text-stone-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Active</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Served</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white ring-1 ring-stone-300" /> Free</span>
        </div>
      </div>

      <div
        className="relative flex flex-col justify-between gap-1 px-6 py-5"
        style={{
          minHeight: '320px',
          background:
            'linear-gradient(165deg,#faf3e8 0%,#f2e6d5 55%,#ecdec9 100%), repeating-linear-gradient(0deg, rgba(140,100,60,.05) 0 1px, transparent 1px 26px)',
        }}
      >
        {/* soft light from the window side */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(70% 55% at 8% 40%, rgba(255,255,255,.75), transparent 65%)' }}
        />

        {/* back wall — bar with stools */}
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-7 flex-1 items-center rounded-md px-3 shadow-inner"
            style={{ background: 'linear-gradient(180deg,#dcc7a8,#cdb491)' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-amber-950/45">
              Bar · counter
            </span>
          </div>
          <div className="flex gap-2 pr-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full bg-stone-400/35" />
            ))}
          </div>
        </div>

        {/* main floor — four-tops */}
        <div className="relative flex items-center justify-around">
          <FloorTable label="Table 1" seats={4} state="active" badge="new" />
          <FloorTable label="Table 2" seats={4} state="free" />
          <FloorTable label="Table 3" seats={4} state="active" badge="called" />
        </div>

        {/* window side — two-tops */}
        <div className="relative flex items-center justify-around">
          <FloorTable label="T4" seats={2} d={38} state="active" badge="here" />
          <FloorTable label="T5" seats={2} d={38} state="free" />
          <FloorTable label="T6" seats={2} d={38} state="served" badge="bill" />
          <FloorTable label="T7" seats={2} d={38} state="free" />
        </div>

        {/* window label down the left edge */}
        <span className="pointer-events-none absolute bottom-6 left-1.5 rotate-180 text-[8px] font-bold uppercase tracking-[0.3em] text-stone-400/70 [writing-mode:vertical-rl]">
          Window
        </span>
      </div>
    </div>
  )
}

function KitchenMockup() {
  const tickets = [
    { t: 'Table 3', s: 'New', chip: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', items: ['2× Butter Chicken', '1× Garlic Naan'], btn: 'Mark ready', btnCls: 'bg-blue-600 text-white' },
    { t: 'Table 1', s: 'Ready', chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', items: ['1× Lamb Biryani'], btn: 'Mark served', btnCls: 'bg-emerald-600 text-white' },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <ChefHat className="h-4 w-4 text-amber-400" />
          <span className="font-display text-sm font-semibold">Kitchen Display</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {tickets.map((k) => (
          <div key={k.t} className="overflow-hidden rounded-xl bg-white">
            <div className={`h-1 w-full ${k.bar}`} />
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">{k.t}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${k.chip}`}>{k.s}</span>
              </div>
              <div className="mt-2 space-y-1 border-t border-stone-100 pt-2">
                {k.items.map((i) => (
                  <p key={i} className="text-[11px] text-stone-600">{i}</p>
                ))}
              </div>
              <div className={`mt-3 rounded-lg py-1.5 text-center text-[11px] font-semibold ${k.btnCls}`}>
                {k.btn}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 text-[10px] text-white/50">
        <Printer className="h-3 w-3" /> Tickets also print automatically at the pass
      </div>
    </div>
  )
}

function SplitMockup() {
  const payers = [
    { who: 'Payer 1', what: 'Butter Chicken, Naan', amt: '$43.59', method: 'Card', done: true },
    { who: 'Payer 2', what: 'Paneer Tikka, Chai', amt: '$30.51', method: 'Cash', done: true },
    { who: 'Payer 3', what: 'Lamb Biryani', amt: '$23.73', method: 'Card', done: false },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
      <BrowserChrome path="/dashboard/checkout" />
      <div className="border-b border-stone-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold text-stone-900">Table 7 · settling</span>
          <span className="text-sm font-bold text-stone-900">$97.83</span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500">Split evenly</span>
          <span className="rounded-lg bg-brand px-2.5 py-1 text-[10px] font-semibold text-white">Split by item</span>
        </div>
      </div>
      <div className="space-y-2 bg-[#faf6ef] p-4">
        {payers.map((p) => (
          <div key={p.who} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
            <span
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                p.done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'
              }`}
            >
              {p.done ? <Check className="h-3.5 w-3.5" /> : '3'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-stone-900">{p.who}</span>
              <span className="block truncate text-[10px] text-stone-500">{p.what}</span>
            </span>
            <span className="text-right">
              <span className="block text-[11px] font-bold text-stone-900">{p.amt}</span>
              <span className="block text-[9px] uppercase tracking-wide text-stone-400">{p.method}</span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-stone-900 px-3 py-2.5 text-white">
          <span className="text-[11px] text-white/70">Outstanding</span>
          <span className="text-[11px] font-bold">$23.73</span>
        </div>
      </div>
    </div>
  )
}

function MenuEditMockup() {
  const rows = [
    { name: 'Butter Chicken', price: '$19.00', diet: 'non-veg', on: true, img: DISH.butterChicken },
    { name: 'Paneer Tikka', price: '$16.00', diet: 'veg', on: true, img: DISH.paneerTikka },
    { name: 'Lamb Biryani', price: '$22.00', diet: 'non-veg', on: false, img: DISH.biryani },
    { name: 'Chana Masala', price: '$15.00', diet: 'veg', on: true, img: DISH.chana },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
      <BrowserChrome path="/dashboard/menu" />
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <span className="font-display text-sm font-semibold text-stone-900">Curries & Mains</span>
        <span className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3" /> Add item
        </span>
      </div>
      <div className="divide-y divide-stone-100">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 px-4 py-3">
            <img
              src={r.img}
              alt=""
              loading="lazy"
              className={`h-9 w-9 flex-shrink-0 rounded-lg bg-stone-100 object-cover ${r.on ? '' : 'opacity-40 grayscale'}`}
            />
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <MiniDiet diet={r.diet} />
              <span className={`truncate text-xs font-medium ${r.on ? 'text-stone-800' : 'text-stone-400 line-through'}`}>
                {r.name}
              </span>
            </span>
            <span className={`text-xs font-semibold ${r.on ? 'text-stone-900' : 'text-stone-300'}`}>{r.price}</span>
            <span
              className={`flex h-4 w-7 flex-shrink-0 items-center rounded-full px-0.5 ${
                r.on ? 'justify-end bg-emerald-500' : 'justify-start bg-stone-200'
              }`}
            >
              <span className="h-3 w-3 rounded-full bg-white shadow-sm" />
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100 bg-stone-50 px-4 py-2.5 text-[10px] text-stone-500">
        Toggling an item off removes it from every table instantly.
      </div>
    </div>
  )
}

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-white/35">{title}</p>
      <div className="mt-3 flex flex-col gap-2.5 text-sm text-white/65">{children}</div>
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
