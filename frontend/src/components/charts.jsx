import { useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'

// A "nice" axis maximum: 43,500 -> 50,000 (4 equal steps)
const niceMax = (max) => {
  if (max <= 0) return 4
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  return step * 4
}

// Short form: 150000 -> 1.5L, 12000 -> 12K (Bangladeshi lakh style)
// unitFrom forces one unit so every axis label matches (0.5L, 1L, 1.5L)
const compactTaka = (n, unitFrom = n) => {
  if (n === 0) return '৳0'
  if (unitFrom >= 10000000) return `৳${+(n / 10000000).toFixed(2)}Cr`
  if (unitFrom >= 100000) return `৳${+(n / 100000).toFixed(2)}L`
  if (unitFrom >= 1000) return `৳${+(n / 1000).toFixed(1)}K`
  return `৳${n}`
}

/*
 * Column chart (single series): y-axis + grid line + hover/focus tooltip + table view
 * data = [{ key, label, value }]
 */
export function ColumnChart({ data, format, ariaLabel }) {
  const [active, setActive] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const top = niceMax(Math.max(...data.map((d) => d.value)))
  const ticks = [4, 3, 2, 1, 0].map((i) => (top / 4) * i)
  const maxKey = data.reduce((m, d) => (d.value > (m?.value ?? -1) ? d : m), null)?.key
  const latestKey = data.at(-1)?.key

  return (
    <div className="px-5 pb-4 pt-3">
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setAsTable(!asTable)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          {asTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
          {asTable ? 'Chart view' : 'Table view'}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 font-medium">Month</th>
              <th className="py-2 text-right font-medium">Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-2 text-slate-700">{d.label}</td>
                <td className="tabular-nums py-2 text-right font-medium text-slate-900">{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex gap-3" role="img" aria-label={ariaLabel}>
          {/* y-axis labels */}
          <div className="relative h-48 w-12 shrink-0 text-right text-[11px] text-slate-400">
            {ticks.map((t, i) => (
              <span key={t} className="tabular-nums absolute right-0 -translate-y-1/2" style={{ top: `${(i / 4) * 100}%` }}>
                {compactTaka(t, top)}
              </span>
            ))}
          </div>

          <div className="flex-1">
            <div className="relative h-48">
              {/* grid lines (subtle) */}
              {ticks.map((t, i) => (
                <div
                  key={t}
                  className={`absolute inset-x-0 border-t ${i === 4 ? 'border-slate-300' : 'border-dashed border-slate-200'}`}
                  style={{ top: `${(i / 4) * 100}%` }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2 sm:gap-4">
                {data.map((d) => {
                  const h = (d.value / top) * 100
                  const isActive = active === d.key
                  const showLabel = !active && d.value > 0 && (d.key === maxKey || d.key === latestKey)
                  return (
                    <button
                      key={d.key}
                      type="button"
                      aria-label={`${d.label}: ${format(d.value)}`}
                      onMouseEnter={() => setActive(d.key)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(d.key)}
                      onBlur={() => setActive(null)}
                      className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                    >
                      {/* hover background band -> larger hit target */}
                      <span className={`absolute inset-0 rounded-md transition-colors ${isActive ? 'bg-slate-100/70' : ''}`} />
                      <span
                        className={`relative w-full max-w-10 rounded-t-[4px] transition-colors ${isActive ? 'bg-navy-800' : 'bg-navy-600'}`}
                        style={{ height: d.value ? `max(${h}%, 3px)` : '0' }}
                      />
                      {showLabel && (
                        <span
                          className="tabular-nums absolute -translate-y-full whitespace-nowrap pb-1 text-[11px] font-semibold text-slate-700"
                          style={{ bottom: `${h}%` }}
                        >
                          {compactTaka(d.value)}
                        </span>
                      )}
                      {isActive && (
                        <span
                          className="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-left text-xs text-white shadow-lg"
                          style={{ bottom: `calc(${h}% + 8px)` }}
                        >
                          <span className="block text-slate-300">{d.label}</span>
                          <span className="tabular-nums block text-sm font-semibold">{format(d.value)}</span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            {/* x-axis labels */}
            <div className="mt-2 flex gap-2 sm:gap-4">
              {data.map((d) => (
                <span key={d.key} className={`flex-1 text-center text-xs ${active === d.key ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/*
 * Horizontal bar list (ranking): label, count and amount are written directly
 * items = [{ title, count, amount }]
 */
export function BarList({ items, format }) {
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <ul className="space-y-4 p-5">
      {items.map((v, idx) => (
        <li key={v.title}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="tabular-nums w-4 shrink-0 text-xs font-semibold text-slate-400">{idx + 1}</span>
              <span className="truncate font-medium text-slate-700">{v.title}</span>
            </span>
            <span className="tabular-nums shrink-0 text-xs text-slate-500">
              <b className="text-slate-900">{v.count}</b> {v.count === 1 ? 'fine' : 'fines'} · {format(v.amount)}
            </span>
          </div>
          <div className="ml-6 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-navy-600" style={{ width: `${(v.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
