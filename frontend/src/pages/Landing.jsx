import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  History,
  QrCode,
  ScanSearch,
  ShieldCheck,
  ShieldHalf,
  Smartphone,
  TrendingUp,
} from 'lucide-react'
import api from '../api/client'
import FineLookup from '../components/FineLookup'
import HeroIllustration from '../components/HeroIllustration'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { BRAND, TAGLINE } from '../brand'

// 1-2-3-4: how the system works
const steps = [
  { icon: ScanSearch, title: 'Inspect', text: 'Naval Police check a vessel at the ghat or on the river using its registration number.' },
  { icon: ClipboardCheck, title: 'Issue e-fine', text: 'A digital fine is recorded instantly. Repeat offences are detected and charged 2×.' },
  { icon: CreditCard, title: 'Check & pay', text: 'Owners see the fine online and pay by bKash, Nagad, Rocket or card within 30 days.' },
  { icon: QrCode, title: 'Verify anywhere', text: 'Every receipt has a QR code. Scan it to confirm the payment is genuine.' },
]

const features = [
  { icon: FileSearch, title: 'Instant fine lookup', text: 'Anyone can check unpaid fines with a vessel registration number.' },
  { icon: ShieldCheck, title: 'On-the-spot e-fines', text: 'Naval Police issue digital fines with automatic repeat-offence detection.' },
  { icon: Smartphone, title: 'Pay online', text: 'Owners pay via bKash, Nagad, Rocket or card and download a PDF receipt.' },
  { icon: BadgeCheck, title: 'QR-verified receipts', text: 'Fake receipts are caught in seconds — every receipt is checked against the system.' },
  { icon: TrendingUp, title: 'Automatic late fees', text: 'Unpaid fines grow 5% every 30 days (10% for repeat offences) until paid.' },
  { icon: History, title: 'Full audit trail', text: 'Every login, fine, payment and change is recorded and cannot be edited.' },
]

const portals = [
  { to: '/login', icon: Anchor, title: 'Vessel Owner', text: 'Register vessels, view and pay fines', tone: 'bg-teal-50 text-teal-700' },
  { to: '/police/login', icon: ShieldCheck, title: 'Naval Police', text: 'Issue fines and inspect vessels', tone: 'bg-sky-50 text-sky-700' },
  { to: '/admin/login', icon: ShieldHalf, title: 'Admin', text: 'Manage users, violations and reports', tone: 'bg-violet-50 text-violet-700' },
]

// 1500000 -> "৳15 lakh", 25000000 -> "৳2.5 crore"
const bigTaka = (n) => {
  if (n >= 10000000) return `৳${+(n / 10000000).toFixed(1)} crore`
  if (n >= 100000) return `৳${+(n / 100000).toFixed(1)} lakh`
  return `৳${Number(n).toLocaleString('en-IN')}`
}

function Stats() {
  const [s, setS] = useState(null)
  useEffect(() => {
    api
      .get('/public/stats')
      .then(({ data }) => setS(data))
      .catch(() => setS(false)) // hide the section if the API is unavailable
  }, [])
  if (s === false) return null

  const items = [
    { label: 'Registered vessels', value: s ? s.vessels.toLocaleString('en-IN') : '—' },
    { label: 'Fines issued', value: s ? s.finesIssued.toLocaleString('en-IN') : '—' },
    { label: 'Fines collected', value: s ? bigTaka(s.collected) : '—' },
    { label: 'Fines paid', value: s ? `${s.paidRate}%` : '—' },
  ]
  return (
    <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-4">
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-navy-950/5 lg:grid-cols-4">
        {items.map((i, idx) => (
          <div
            key={i.label}
            className={`px-6 py-5 ${idx % 2 ? 'border-l border-slate-100' : ''} ${idx >= 2 ? 'border-t border-slate-100 lg:border-t-0' : ''} ${idx === 2 ? 'lg:border-l' : ''}`}
          >
            <dt className="text-sm text-slate-500">{i.label}</dt>
            <dd className="tabular-nums mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">{i.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-navy-950">{title}</h2>
      {text && <p className="mt-3 text-slate-500">{text}</p>}
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-white">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-base text-slate-600 md:flex">
            <a href="#how" className="hover:text-navy-900">
              How it works
            </a>
            <a href="#features" className="hover:text-navy-900">
              Features
            </a>
            <Link to="/verify" className="hover:text-navy-900">
              Verify receipt
            </Link>
            <a href="#portals" className="hover:text-navy-900">
              Portals
            </a>
          </nav>
          <div className="flex gap-2">
            {user ? (
              <Link to="/app" className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-lg px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 sm:inline-block">
                  Owner log in
                </Link>
                <Link to="/register" className="rounded-lg bg-navy-700 px-4 py-2 text-base font-medium text-white hover:bg-navy-800">
                  Register vessel
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-navy-950 px-4 pb-28 pt-14 text-white lg:pt-20">
        {/* subtle grid pattern */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at top, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at top, black 30%, transparent 75%)',
          }}
        />
        <div aria-hidden className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-teal-400/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-navy-500/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-200 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> {TAGLINE}
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Digital Solutions,
              <br />
              <span className="bg-gradient-to-r from-teal-200 to-sky-300 bg-clip-text text-transparent">for a Safer Maritime</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-100/80">
              For launches, cargo ships and boats. Check a vessel&apos;s unpaid fines below.
            </p>
            <div className="mt-8 max-w-xl rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <FineLookup initialRegNo={params.get('reg') || ''} />
            </div>
            <Link to="/verify" className="mt-4 inline-flex items-center gap-1.5 text-lg text-teal-200 hover:text-white">
              <BadgeCheck size={25} /> Click here to verify a payment receipt
            </Link>
          </div>
          <div className="hidden lg:block">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <Stats />

      {/* ---------- How it works ---------- */}
      <section id="how" className="scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="How it works" title="From inspection to verified payment" text="Four simple steps, fully digital — no paper challans, no lost records." />
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-navy-50 p-2.5 text-navy-700">
                    <Icon size={22} />
                  </div>
                  <span className="text-4xl font-bold text-slate-100">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="scroll-mt-20 bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Features" title="Built for the waterways" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="inline-flex rounded-xl bg-teal-50 p-2.5 text-teal-700">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Portals ---------- */}
      <section id="portals" className="scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Portals" title="One system, three portals" text="Each role signs in through its own portal." />
          <div className="grid gap-4 sm:grid-cols-3">
            {portals.map(({ to, icon: Icon, title, text, tone }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-md"
              >
                <div className={`rounded-xl p-2.5 ${tone}`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <p className="flex items-center gap-1 font-semibold text-slate-900">
                    {title} <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-950 px-8 py-12 text-white sm:px-12">
          <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Own a launch, cargo ship or boat?</h2>
              <p className="mt-2 text-navy-100/80">Register your vessels, track fines and pay online — all in one place.</p>
            </div>
            <Link
              to="/register"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-navy-900 transition hover:bg-teal-50"
            >
              Register as owner <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 pt-12">
        <div className="mx-auto grid max-w-6xl gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-slate-500">{BRAND} is a {TAGLINE.toLowerCase()} for launches, cargo ships and boats on inland waterways.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Public</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-navy-800">
                  Check unpaid fines
                </button>
              </li>
              <li>
                <Link to="/verify" className="hover:text-navy-800">
                  Verify a receipt
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-navy-800">
                  Register as owner
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Portals</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              {portals.map((p) => (
                <li key={p.to}>
                  <Link to={p.to} className="hover:text-navy-800">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          © {year} {BRAND} — {TAGLINE}
        </div>
      </footer>
    </div>
  )
}
