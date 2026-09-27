import { useEffect, useState } from 'react'
import { Search, X, ShieldCheck } from 'lucide-react'
import { useFetch } from '../hooks'
import { Alert, Badge, Card, PageHeader, Pagination, Spinner, Table } from '../components/ui'
import { dateTime, ROLE_LABEL, taka } from '../utils/format'

// action -> { label, tone } (tone = ui.jsx badge color key)
const ACTIONS = {
  LOGIN_SUCCESS: ['Logged in', 'Active'],
  LOGIN_FAILED: ['Failed login', 'Overdue'],
  ADMIN_KEY_REJECTED: ['Wrong admin key', 'Overdue'],
  USER_REGISTERED: ['Registered', 'police'],
  USER_CREATED: ['User created', 'police'],
  USER_APPROVED: ['Approved', 'Active'],
  USER_REJECTED: ['Rejected', 'Cancelled'],
  USER_ACTIVATED: ['Activated', 'Active'],
  USER_DEACTIVATED: ['Deactivated', 'Unpaid'],
  USER_REMOVED: ['User removed', 'Overdue'],
  VESSEL_CREATED: ['Vessel added', 'police'],
  VESSEL_UPDATED: ['Vessel edited', 'Minor'],
  VESSEL_SUSPENDED: ['Vessel suspended', 'Unpaid'],
  VESSEL_ACTIVATED: ['Vessel activated', 'Active'],
  VESSEL_REMOVED: ['Vessel removed', 'Overdue'],
  VIOLATION_CREATED: ['Violation added', 'police'],
  VIOLATION_UPDATED: ['Violation edited', 'Minor'],
  VIOLATION_DEACTIVATED: ['Violation deactivated', 'Unpaid'],
  FINE_ISSUED: ['Fine issued', 'Unpaid'],
  FINE_CANCELLED: ['Fine cancelled', 'Cancelled'],
  PAYMENT_RECORDED: ['Payment', 'Active'],
}

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'auth', label: 'Logins' },
  { key: 'user', label: 'Users' },
  { key: 'vessel', label: 'Vessels' },
  { key: 'fine', label: 'Fines' },
  { key: 'payment', label: 'Payments' },
  { key: 'violation', label: 'Violations' },
]

const pretty = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
const isMoney = (key) => /amount|fee/i.test(key)
const show = (v, key = '') =>
  v === null || v === undefined || v === ''
    ? '—'
    : typeof v === 'boolean'
      ? v ? 'yes' : 'no'
      : typeof v === 'number' && isMoney(key)
        ? taka(v)
        : String(v)

// details object -> short list. { route: { from, to } } renders as "Route: A → B"
function Details({ details }) {
  const entries = Object.entries(details || {})
  if (!entries.length) return <span className="text-slate-400">—</span>
  return (
    <ul className="space-y-0.5 text-xs text-slate-600">
      {entries.map(([k, v]) => (
        <li key={k} className="max-w-md whitespace-normal">
          <span className="text-slate-400">{pretty(k)}:</span>{' '}
          {v && typeof v === 'object' && 'to' in v ? (
            <>
              <span className="line-through decoration-slate-300">{show(v.from, k)}</span> → <b className="text-slate-800">{show(v.to, k)}</b>
            </>
          ) : (
            <span className="text-slate-800">{show(v, k)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function AuditLog() {
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const params = new URLSearchParams(
    Object.entries({ entityType: category, search, from, to, page }).filter(([, v]) => v !== '' && v !== undefined),
  ).toString()
  const { data, loading, error } = useFetch(`/audit-logs?${params}`)

  const columns = [
    { key: 'createdAt', label: 'Time', render: (l) => <span className="text-slate-600">{dateTime(l.createdAt)}</span> },
    {
      key: 'actor',
      label: 'Who',
      render: (l) => (
        <div>
          <p className="font-medium text-slate-800">{l.actorName}</p>
          {l.actorRole !== 'public' ? (
            <Badge tone={l.actorRole}>{ROLE_LABEL[l.actorRole] || l.actorRole}</Badge>
          ) : (
            <span className="text-xs text-slate-400">Not logged in</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (l) => {
        const [label, tone] = ACTIONS[l.action] || [l.action, 'Cancelled']
        return <Badge tone={tone}>{label}</Badge>
      },
    },
    { key: 'entityLabel', label: 'Target', render: (l) => <span className="font-mono text-xs">{l.entityLabel || '—'}</span> },
    { key: 'details', label: 'Details', render: (l) => <Details details={l.details} /> },
    { key: 'ip', label: 'IP', render: (l) => <span className="font-mono text-xs text-slate-400">{l.ip || '—'}</span> },
  ]

  const dateCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500'

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Every important action — who did it, when, and what changed. Records cannot be edited or deleted."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck size={14} /> Read-only
          </span>
        }
      />
      <Card>
        <div className="space-y-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key || 'all'}
                onClick={() => {
                  setCategory(c.key)
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  category === c.key ? 'bg-navy-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search person, email, reg. no., fine no. or transaction"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none focus:border-navy-500"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400" title="Clear">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <input type="date" aria-label="From date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} className={dateCls} />
              <span>to</span>
              <input type="date" aria-label="To date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} className={dateCls} />
            </div>
          </div>
        </div>
        <Alert>{error}</Alert>
        {loading && !data ? (
          <Spinner />
        ) : (
          <>
            <Table columns={columns} rows={data?.items || []} empty="No activity found" />
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
