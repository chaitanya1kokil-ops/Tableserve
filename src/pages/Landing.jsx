import { Link } from 'react-router-dom'
import {
  QrCode,
  UtensilsCrossed,
  LayoutDashboard,
  Zap,
  ArrowRight,
  Store,
  ChefHat,
  Timer,
  ClipboardList,
  BarChart3,
  Palette,
  Check,
  LogIn,
  Smartphone,
  Frown,
  FileWarning,
  Wallet,
  MonitorPlay,
  Target,
  Radio,
  MousePointerClick,
  Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import heroBg from '../../pitch/assets/hero_restaurant_qr.png'
import problemImg from '../../pitch/assets/problem_slide_chaos.png'
import kitchenImg from '../../pitch/assets/kitchen_dashboard_mockup.png'

/* ------------------------------------------------------------------ theme -- */
const GOLD = '#F5A623'
const ORANGE = '#E8763A'
const goldGradient = { background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }

const gridBg = {
  backgroundImage:
    'linear-gradient(rgba(245,166,35,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.04) 1px, transparent 1px)',
  backgroundSize: '60px 60px',
}

/* ------------------------------------------------------------------- data -- */
const heroPills = [
  { icon: QrCode, label: 'QR-Based Ordering', gold: true },
  { icon: Zap, label: 'Real-time Kitchen Display' },
  { icon: BarChart3, label: 'Live Analytics', gold: true },
  { icon: Smartphone, label: 'No App Required' },
]

const pains = [
  {
    icon: Frown,
    title: 'Customers wait too long to order',
    desc: 'Peak hours mean 10 to 20 minute waits just to place an order, and some customers simply leave.',
  },
  {
    icon: FileWarning,
    title: 'Handwritten orders get lost or wrong',
    desc: 'Order errors cost you remakes, refunds, and bad reviews every single week.',
  },
  {
    icon: Wallet,
    title: 'Staff costs keep rising',
    desc: 'A single waiter costs $2,000 to $3,500 a month, and you need two or three just for orders.',
  },
]

const painStats = [
  { num: '68%', label: 'of diners prefer self-ordering' },
  { num: '$400', label: 'avg monthly loss from order errors' },
  { num: '23%', label: 'higher order value with digital menus' },
]

const steps = [
  {
    n: '01',
    icon: QrCode,
    title: 'Customer scans QR',
    desc: 'A unique QR code sits on every table. Customers scan with any phone camera. No download, no account, no friction.',
  },
  {
    n: '02',
    icon: MousePointerClick,
    title: 'Browses & orders',
    desc: 'Your branded menu with photos, modifiers, and categories. Add to cart, customise, and place the order in under 60 seconds.',
  },
  {
    n: '03',
    icon: Zap,
    title: 'Kitchen gets it instantly',
    desc: 'Orders appear live in your kitchen dashboard. Status updates push back to the customer’s phone in real time.',
  },
]

const features = [
  {
    icon: ClipboardList,
    title: 'Menu Management',
    desc: 'Add categories, items with photos, modifiers and price deltas. Update anytime and it goes live instantly.',
    badge: 'Instant updates',
  },
  {
    icon: QrCode,
    title: 'QR Code Generator',
    desc: 'Bulk-create tables and auto-generate unique QR codes per table. Download as PNG or print all at once.',
    badge: 'Print-ready',
  },
  {
    icon: Zap,
    title: 'Live Orders Board',
    desc: 'Orders stream in real time. Advance status: New, Preparing, Ready, Served, Completed.',
    badge: 'Real-time',
  },
  {
    icon: ChefHat,
    title: 'Kitchen Display',
    desc: 'Dedicated kitchen view with all active orders, ticket age, and one-tap status advancement.',
    badge: 'No printer needed',
  },
  {
    icon: BarChart3,
    title: 'Sales Overview',
    desc: 'Today’s revenue, average order value, most popular items, and order count at a glance.',
    badge: 'Live analytics',
  },
  {
    icon: Palette,
    title: 'Your Branding',
    desc: 'Upload your logo and set your accent colour. Customers see your brand on every screen, not ours.',
    badge: 'White-label',
  },
]

const kitchenPoints = [
  {
    icon: MonitorPlay,
    title: 'Big-screen display mode',
    desc: 'Mount a tablet or TV in the kitchen and orders appear the moment they are placed.',
  },
  {
    icon: Target,
    title: 'Zero miscommunication',
    desc: 'Every modifier and special request is captured digitally. No more misread handwriting.',
  },
  {
    icon: Radio,
    title: 'Real-time, always',
    desc: 'Powered by Supabase Realtime with sub-second latency from order to kitchen screen.',
  },
  {
    icon: Check,
    title: 'One-tap status updates',
    desc: 'Advance from Preparing to Ready with a single tap. Customers are notified instantly.',
  },
]

const roiCards = [
  { num: '$2,500', color: 'text-emerald-400', label: 'Monthly savings on staff', note: 'Reduce 1 waiter shift/day at $15/hr' },
  { num: '23%', color: 'text-[#F5A623]', label: 'Higher avg order value', note: 'Customers order more when browsing at their own pace' },
  { num: '$400', color: 'text-emerald-400', label: 'Saved from fewer errors', note: 'No more remakes, refunds, or waste' },
  { num: '14x', color: 'text-[#F5A623]', label: 'Return on investment', note: '$149/mo cost vs $2,000+/mo savings' },
]

const plans = [
  {
    tier: 'Starter',
    price: 59,
    desc: 'Perfect for cafes & food trucks',
    features: ['Up to 10 tables', 'Unlimited menu items', 'Live orders board', 'QR code generator', 'Email support'],
    cta: 'Get Started',
    to: '/signup',
  },
  {
    tier: 'Growth',
    price: 149,
    desc: 'For busy restaurants that mean business',
    features: ['Up to 30 tables', 'Custom branding & logo', 'Kitchen display mode', 'Sales analytics dashboard', 'Priority support'],
    cta: 'Start 14-Day Free Trial',
    to: '/signup',
    featured: true,
  },
  {
    tier: 'Pro',
    price: 299,
    desc: 'Multi-location & high-volume venues',
    features: ['Unlimited tables', 'Multiple locations', 'Advanced analytics', 'White-label QR codes', 'Dedicated support'],
    cta: 'Contact Us',
    to: '/signup',
  },
]

/* -------------------------------------------------------------- component -- */
export default function Landing() {
  const { user, isAnonymous, profile, restaurant } = useAuth()
  const loggedIn = user && !isAnonymous
  const ctaTo = profile?.role === 'platform_admin' ? '/admin' : restaurant ? '/dashboard' : '/onboarding'

  return (
    <div className="min-h-[100dvh] bg-[#0A0F1E] text-[#F0F4FF]">
      {/* ------------------------------------------------------------ nav -- */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0F1E]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg text-black" style={goldGradient}>
              <Store className="h-5 w-5" />
            </span>
            TableServe
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#8899BB] md:flex">
            <a href="#problem" className="transition hover:text-white">The Problem</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link
                to={ctaTo}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-black transition hover:opacity-90"
                style={goldGradient}
              >
                Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
                >
                  <LogIn className="h-4 w-4" /> Log in
                </Link>
                <Link
                  to="/signup"
                  className="hidden rounded-xl px-4 py-2 text-sm font-bold text-black transition hover:opacity-90 sm:block"
                  style={goldGradient}
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero -- */}
      <section id="top" className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-100"
          style={{ backgroundImage: `url(${heroBg})`, filter: 'brightness(0.18) saturate(0.6)' }}
        />
        <div className="absolute inset-0" style={gridBg} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(245,166,35,0.12), transparent 60%), radial-gradient(ellipse 60% 60% at 80% 80%, rgba(232,118,58,0.10), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:pt-28">
          <p
            className="mb-5 bg-clip-text text-xs font-bold uppercase tracking-[0.4em] text-transparent"
            style={{ backgroundImage: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}
          >
            TableServe
          </p>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[1.05] sm:text-7xl">
            The Future of
            <br />
            <span className="text-[#F5A623]">Restaurant Ordering</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#8899BB] sm:text-lg">
            Customers scan, tap, and order. No app, no waiter, no wait.
            <br className="hidden sm:block" />
            You get real-time orders, happier tables, and more revenue.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={loggedIn ? ctaTo : '/signup'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 font-bold text-black transition hover:-translate-y-0.5 sm:w-auto"
              style={goldGradient}
            >
              {loggedIn ? 'Open your dashboard' : 'Start Free Trial'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-8 py-4 font-bold transition hover:bg-white/5 sm:w-auto"
            >
              <LogIn className="h-4 w-4" /> Log in
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {heroPills.map((p) => (
              <span
                key={p.label}
                className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-medium backdrop-blur ${
                  p.gold
                    ? 'border-[#F5A623]/30 bg-white/[0.04] text-[#FFD07B]'
                    : 'border-white/10 bg-white/[0.04] text-[#8899BB]'
                }`}
              >
                <p.icon className="h-4 w-4" /> {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- problem -- */}
      <section id="problem" className="relative border-t border-white/5 bg-[#0F1729]">
        <div className="absolute inset-0" style={gridBg} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-2">
          <img
            src={problemImg}
            alt="A slammed dining room with staff running between tables"
            className="rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
            loading="lazy"
          />
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-[#E74C3C]">The Problem</p>
            <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Your staff is
              <br />
              stretched thin
            </h2>
            <div className="mt-8 space-y-5">
              {pains.map((p) => (
                <div key={p.title} className="flex items-start gap-4">
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-[#E74C3C]/30 bg-[#E74C3C]/15 text-[#E74C3C]">
                    <p.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#8899BB]">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              {painStats.map((s) => (
                <div key={s.num} className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-center">
                  <p className="text-3xl font-black text-[#E74C3C]">{s.num}</p>
                  <p className="mt-1 max-w-[9rem] text-xs text-[#8899BB]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ how -- */}
      <section id="how" className="relative">
        <div className="absolute inset-0" style={gridBg} />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-emerald-400">The Solution</p>
            <h2 className="font-display text-4xl font-semibold sm:text-5xl">3 Steps. Zero Friction.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur transition hover:-translate-y-1.5 hover:border-[#F5A623]/30"
              >
                <p
                  className="bg-clip-text text-6xl font-black text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}
                >
                  {s.n}
                </p>
                <span className="mt-4 inline-grid h-12 w-12 place-items-center rounded-2xl border border-[#F5A623]/20 bg-[#F5A623]/10 text-[#F5A623]">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#8899BB]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- features -- */}
      <section id="features" className="relative border-t border-white/5 bg-[#0F1729]">
        <div className="absolute inset-0" style={gridBg} />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-[#E8763A]">Everything You Need</p>
            <h2 className="font-display text-4xl font-semibold sm:text-5xl">One platform. Complete control.</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#F5A623]/25 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
              >
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl border border-[#F5A623]/20 bg-[#F5A623]/10 text-[#F5A623]">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8899BB]">{f.desc}</p>
                <span className="mt-3 inline-block rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                  {f.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- kitchen -- */}
      <section className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-16 sm:px-12 sm:py-24 lg:px-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-[#F5A623]">Kitchen-First Design</p>
          <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Your kitchen,
            <br />
            <span className="text-[#F5A623]">always in sync</span>
          </h2>
          <div className="mt-9 space-y-6">
            {kitchenPoints.map((k) => (
              <div key={k.title} className="flex items-start gap-4">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-[#F5A623]/20 bg-[#F5A623]/10 text-[#F5A623]">
                  <k.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">{k.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#8899BB]">{k.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[320px]">
          <img src={kitchenImg} alt="Kitchen display board full of live orders" className="h-full w-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, #0A0F1E 0%, transparent 40%)' }}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ roi -- */}
      <section className="relative border-t border-white/5">
        <div className="absolute inset-0" style={gridBg} />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-emerald-400">Your Return on Investment</p>
            <h2 className="font-display text-4xl font-semibold sm:text-5xl">Pay $149/mo. Save $2,000+/mo.</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {roiCards.map((r) => (
              <div key={r.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center">
                <p className={`text-4xl font-black ${r.color}`}>{r.num}</p>
                <p className="mt-2 text-sm font-semibold">{r.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8899BB]">{r.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            <div className="w-full rounded-2xl border border-[#E74C3C]/20 bg-[#E74C3C]/10 px-8 py-4 text-center sm:w-auto">
              <p className="text-[11px] text-[#8899BB]">Monthly cost</p>
              <p className="text-2xl font-black text-[#E74C3C]">$149</p>
            </div>
            <span className="text-xl text-[#8899BB]">vs</span>
            <div className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-8 py-4 text-center sm:w-auto">
              <p className="text-[11px] text-[#8899BB]">Monthly savings</p>
              <p className="text-2xl font-black text-emerald-400">$2,900+</p>
            </div>
            <span className="text-xl text-[#8899BB]">=</span>
            <div className="w-full rounded-2xl border border-[#F5A623]/20 bg-[#F5A623]/10 px-8 py-4 text-center sm:w-auto">
              <p className="text-[11px] text-[#8899BB]">Net monthly gain</p>
              <p className="text-2xl font-black text-[#F5A623]">$2,751</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- pricing -- */}
      <section id="pricing" className="relative border-t border-white/5 bg-[#0F1729]">
        <div className="absolute inset-0" style={gridBg} />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-[#F5A623]">Simple Pricing</p>
            <h2 className="font-display text-4xl font-semibold sm:text-5xl">Start free. Scale as you grow.</h2>
          </div>
          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.tier}
                className={`relative flex flex-col rounded-3xl border p-8 transition hover:-translate-y-1.5 ${
                  p.featured
                    ? 'border-[#F5A623]/40 bg-gradient-to-br from-[#F5A623]/[0.12] to-[#E8763A]/[0.08]'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                {p.featured && (
                  <span
                    className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-extrabold text-black"
                    style={goldGradient}
                  >
                    <Star className="h-3 w-3 fill-black" /> Most Popular
                  </span>
                )}
                <p className={`text-[13px] font-bold uppercase tracking-[0.2em] ${p.featured ? 'text-[#F5A623]' : 'text-[#8899BB]'}`}>
                  {p.tier}
                </p>
                <p className="mt-3 text-5xl font-black">
                  <sup className="align-top text-2xl text-[#F5A623]">$</sup>
                  {p.price}
                  <span className="ml-1 text-sm font-normal text-[#8899BB]">/mo</span>
                </p>
                <p className="mb-6 mt-3 border-b border-white/10 pb-6 text-sm text-[#8899BB]">{p.desc}</p>
                <div className="space-y-2.5">
                  {p.features.map((f) => (
                    <p key={f} className="flex items-center gap-2 text-sm text-[#cdd5e0]">
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" /> {f}
                    </p>
                  ))}
                </div>
                <Link
                  to={p.to}
                  className={`mt-8 rounded-xl py-3.5 text-center text-sm font-bold transition ${
                    p.featured ? 'text-black hover:opacity-90' : 'border border-white/15 hover:bg-white/5'
                  }`}
                  style={p.featured ? goldGradient : undefined}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-9 text-center text-sm text-[#8899BB]">
            All plans include a <strong className="text-[#F5A623]">14-day free trial</strong>. No credit card required.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ cta -- */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0" style={gridBg} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,166,35,0.12), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.35em] text-[#F5A623]">Let&rsquo;s Get Started</p>
          <h2 className="font-display text-5xl font-semibold leading-[1.05] sm:text-6xl">
            Ready to transform
            <br />
            your <span className="text-[#F5A623]">restaurant?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-[#8899BB]">
            Setup takes under 10 minutes and your first 14 days are completely free. No credit card,
            no commitment.
          </p>
          <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={loggedIn ? ctaTo : '/signup'}
              className="w-full rounded-2xl px-10 py-4 text-base font-bold text-black transition hover:-translate-y-0.5 sm:w-auto"
              style={goldGradient}
            >
              {loggedIn ? 'Open your dashboard' : 'Start Free Trial'}
            </Link>
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-10 py-4 text-base font-bold transition hover:bg-white/5 sm:w-auto"
            >
              Log in <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 flex flex-col items-center justify-center gap-3 text-[13px] text-[#8899BB] sm:flex-row sm:gap-8">
            {['No app download for customers', 'Setup in under 10 minutes', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- footer -- */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <div>
            <div className="flex items-center gap-2 font-extrabold">
              <span className="grid h-7 w-7 place-items-center rounded-lg text-black" style={goldGradient}>
                <Store className="h-4 w-4" />
              </span>
              TableServe
            </div>
            <p className="mt-2 text-xs text-[#8899BB]">Scan. Order. Enjoy. QR ordering for modern restaurants.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#8899BB]">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
            <Link to="/login" className="transition hover:text-white">Log in</Link>
            <Link to="/signup" className="font-semibold text-[#F5A623]">Sign up</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-[#8899BB]/70">
          © {new Date().getFullYear()} TableServe. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
