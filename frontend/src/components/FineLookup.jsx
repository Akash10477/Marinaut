import { useEffect, useState } from 'react'
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import api, { errMsg } from '../api/client'
import { Button, Badge, Alert } from './ui'
import { taka, date } from '../utils/format'

// Public search: see unpaid fines by registration number (no login needed)
export default function FineLookup({ initialRegNo = '' }) {
  const [regNo, setRegNo] = useState(initialRegNo)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async (e, value = regNo) => {
    e?.preventDefault()
    if (!value.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.get(`/public/fines/${encodeURIComponent(value.trim())}`)
      setResult(data)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  // Scanning a fine notice QR opens /?reg=M-15245 -> search runs automatically
  useEffect(() => {
    if (initialRegNo) search(null, initialRegNo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRegNo])

  return (
    <div>
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={regNo}
            onChange={(e) => setRegNo(e.target.value)}
            placeholder="Enter registration number, e.g. M-15245"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-slate-800 uppercase outline-none placeholder:normal-case focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <Button size="lg" loading={loading} type="submit">
          Check fines
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        <Alert>{error}</Alert>

        {result && (
          <div className="rounded-xl border border-slate-200 bg-white text-left shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-900">{result.vessel.vesselName}</p>
                <p className="text-sm text-slate-500">
                  {result.vessel.registrationNumber} · {result.vessel.vesselType}
                </p>
              </div>
              <Badge>{result.vessel.status}</Badge>
            </div>

            {result.unpaidCount === 0 ? (
              <div className="flex items-center gap-2 px-5 py-6 text-emerald-700">
                <CheckCircle2 size={20} /> No unpaid fines. This vessel is clear.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                  <AlertTriangle size={16} />
                  {result.unpaidCount} unpaid fine(s) · Total payable <b>{taka(result.totalPayable)}</b>
                </div>
                <ul className="divide-y divide-slate-100">
                  {result.fines.map((f) => (
                    <li key={f.fineNumber} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{f.violation}</p>
                        <p className="text-xs text-slate-500">
                          {f.fineNumber} · {f.location} · Due {date(f.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{taka(f.payable)}</p>
                        {f.isOverdue && (
                          <p className="text-xs text-rose-600">
                            incl. {taka(f.lateFee)} late fee ({f.lateFeePeriods} × {f.lateFeeRate}%)
                          </p>
                        )}
                        {f.isOverdue && <Badge>Overdue</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                  Vessel owners can log in to pay these fines online.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
