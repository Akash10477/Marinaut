import { Link } from 'react-router-dom'
import { PORTALS } from '../portals'
import Logo from '../components/Logo'

// Color + icon per portal, with links to the other portals below
export default function AuthLayout({ portal = 'owner', title, subtitle, children, footer }) {
  const p = PORTALS[portal]
  const Icon = p.icon
  return (
    <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br ${p.bg} px-4 py-10`}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-4">
          <Link to="/" aria-label="Home">
            <Logo tone="light" size={40} />
          </Link>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${p.chip}`}>
            <Icon size={16} /> {p.name} Portal
          </span>
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-white/80">{footer}</div>}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
          <span>Other portals:</span>
          {Object.values(PORTALS)
            .filter((x) => x.key !== portal)
            .map((x) => (
              <Link key={x.key} to={x.loginPath} className="rounded-full border border-white/20 px-2.5 py-1 text-white/80 hover:bg-white/10">
                {x.name}
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
