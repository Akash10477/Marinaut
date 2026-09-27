import { Anchor, ShieldCheck, ShieldHalf } from 'lucide-react'

// Three separate portals, each with its own login/register URL, API and colors
export const PORTALS = {
  owner: {
    key: 'owner',
    name: 'Vessel Owner',
    icon: Anchor,
    loginPath: '/login',
    registerPath: '/register',
    api: { login: '/auth/login', register: '/auth/register' },
    bg: 'from-navy-950 to-navy-700',
    chip: 'bg-teal-400/15 text-teal-300',
    loginSubtitle: 'Manage your vessels and pay fines online',
    registerSubtitle: 'Register as a launch, ship or boat owner',
  },
  police: {
    key: 'police',
    name: 'Naval Police',
    icon: ShieldCheck,
    loginPath: '/police/login',
    registerPath: '/police/register',
    api: { login: '/auth/police/login', register: '/auth/police/register' },
    bg: 'from-emerald-950 to-teal-800',
    chip: 'bg-sky-400/15 text-sky-300',
    loginSubtitle: 'Issue and manage fines on the waterways',
    registerSubtitle: 'Your account will be activated after admin approval',
  },
  admin: {
    key: 'admin',
    name: 'Admin',
    icon: ShieldHalf,
    loginPath: '/admin/login',
    registerPath: '/admin/register',
    api: { login: '/auth/admin/login', register: '/auth/admin/register' },
    bg: 'from-zinc-950 to-violet-950',
    chip: 'bg-violet-400/15 text-violet-300',
    loginSubtitle: 'System administration',
    registerSubtitle: 'Requires the admin registration key',
  },
}
