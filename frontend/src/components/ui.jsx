/* eslint-disable react-refresh/only-export-components */
import { Loader2, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'

export function Button({ variant = 'primary', size = 'md', loading, className = '', children, ...props }) {
  const variants = {
    primary: 'bg-navy-700 text-white hover:bg-navy-800 disabled:bg-navy-700/60',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/60',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/60',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

const fieldCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-100'

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const Input = ({ label, hint, className = '', ...props }) => (
  <Field label={label} hint={hint}>
    <input className={`${fieldCls} ${className}`} {...props} />
  </Field>
)

export const Select = ({ label, hint, children, className = '', ...props }) => (
  <Field label={label} hint={hint}>
    <select className={`${fieldCls} ${className}`} {...props}>
      {children}
    </select>
  </Field>
)

export const Textarea = ({ label, hint, className = '', ...props }) => (
  <Field label={label} hint={hint}>
    <textarea className={`${fieldCls} ${className}`} rows={3} {...props} />
  </Field>
)

export const Card = ({ className = '', children }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
)

export const CardHeader = ({ title, action, subtitle }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
    <div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    {action}
  </div>
)

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'navy' }) {
  const tones = {
    navy: 'bg-navy-50 text-navy-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={`rounded-lg p-2.5 ${tones[tone]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </Card>
  )
}

const badgeTones = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Unpaid: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Suspended: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Major: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Minor: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  admin: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  police: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  owner: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  Repeat: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export const Badge = ({ children, tone }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
      badgeTones[tone || children] || 'bg-slate-100 text-slate-700 ring-slate-500/20'
    }`}
  >
    {children}
  </span>
)

export const Spinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-16 text-slate-400 ${className}`}>
    <Loader2 className="animate-spin" size={28} />
  </div>
)

export const Empty = ({ text = 'No data found', children }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-400">
    <Inbox size={32} />
    <p className="text-sm">{text}</p>
    {children}
  </div>
)

export const Alert = ({ type = 'error', children }) =>
  children ? (
    <div
      className={`rounded-lg px-4 py-3 text-sm ${
        type === 'error' ? 'bg-rose-50 text-rose-700' : type === 'info' ? 'bg-sky-50 text-sky-800' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {children}
    </div>
  ) : null

export function Modal({ open, title, onClose, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div
        className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-xl bg-white shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// columns: [{ key, label, render?(row), className? }]
export function Table({ columns, rows, onRowClick, empty }) {
  if (!rows.length) return <Empty text={empty} />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-4 py-3 font-medium ${c.className || ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={row._id || row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
            >
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-4 py-3 ${c.className || ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null
  const { page, pages, total } = pagination
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} /> Prev
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
