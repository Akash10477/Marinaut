import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Ship, FileWarning, FilePlus2, Receipt, ScrollText, Users, LogOut, Menu, X, History,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Badge } from './ui'
import Logo, { LogoMark } from './Logo'
import { ROLE_LABEL } from '../utils/format'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'police', 'owner'], end: true },
  { to: '/app/fines/new', label: 'Issue Fine', icon: FilePlus2, roles: ['admin', 'police'] },
  { to: '/app/fines', label: 'Fines', icon: FileWarning, roles: ['admin', 'police', 'owner'], end: true },
  { to: '/app/vessels', label: 'Vessels', icon: Ship, roles: ['admin', 'police', 'owner'] },
  { to: '/app/payments', label: 'Payments', icon: Receipt, roles: ['admin', 'police', 'owner'] },
  { to: '/app/violations', label: 'Violation Types', icon: ScrollText, roles: ['admin', 'police'] },
  { to: '/app/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/app/audit', label: 'Audit Log', icon: History, roles: ['admin'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const items = NAV.filter((n) => n.roles.includes(user.role))

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 text-navy-100">
      <div className="px-5 py-5">
        <Logo tone="light" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-white/10 font-medium text-white' : 'text-navy-200/80 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-navy-200/70">{user.email}</p>
          <div className="mt-1.5">
            <Badge tone={user.role}>{ROLE_LABEL[user.role]}</Badge>
          </div>
        </div>
        <button
          onClick={() => {
            // ProtectedRoute redirects to the right portal's login page
            logout()
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-200/80 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(!open)} className="rounded p-1 text-slate-600 hover:bg-slate-100">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="inline-flex items-center gap-2 font-semibold text-navy-900">
            <LogoMark size={26} /> <span className="tracking-[0.12em]">MARINAUT</span>
          </span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
