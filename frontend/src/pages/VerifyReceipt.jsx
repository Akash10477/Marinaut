import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, ShieldX, Search, Loader2 } from 'lucide-react'
import Logo from '../components/Logo'
import api from '../api/client'
import { Button } from '../components/ui'
import { dateTime, taka, date } from '../utils/format'

// Public page: scanning a receipt QR code opens /verify/<transactionId>
export default function VerifyReceipt() {
  const { txn } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(txn || '')
  const [state, setState] = useState({ loading: Boolean(txn), result: null, notFound: false })

  useEffect(() => {
    if (!txn) return undefined
    let cancelled = false
    setState({ loading: true, result: null, notFound: false })
    api
      .get(`/public/verify/${encodeURIComponent(txn)}`)
      .then(({ data }) => !cancelled && setState({ loading: false, result: data.receipt, notFound: false }))
      .catch(() => !cancelled && setState({ loading: false, result: null, notFound: true }))
    return () => {
      cancelled = true
    }
  }, [txn])

  const r = state.result
  const rowsData = r && [
    ['Transaction ID', <span key="t" className="font-mono">{r.transactionId}</span>],
    ['Paid on', dateTime(r.paidAt)],
    ['Method', r.method],
    ['Vessel', `${r.vesselName} (${r.registrationNumber})`],
    ['Fine number', <span key="f" className="font-mono">{r.fineNumber}</span>],
    ['Violation', r.violation],
    ['Issued', `${date(r.issuedAt)} · ${r.location}`],
    ['Fine amount', taka(r.fineAmount)],
    ['Late fee', taka(r.lateFee)],
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy-950 px-4 py-4">
        <Link to="/" className="mx-auto flex max-w-xl">
          <Logo tone="light" size={32} />
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-xl font-bold text-slate-900">Verify a payment receipt</h1>
        <p className="mt-1 text-sm text-slate-500">Scan the QR code on a receipt, or type the transaction ID.</p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) navigate(`/verify/${input.trim().toUpperCase()}`)
          }}
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. TXNMFX2A9B1C2D3E4"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <Button type="submit">Verify</Button>
        </form>

        <div className="mt-6">
          {state.loading && (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          )}

          {state.notFound && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
              <ShieldX size={40} className="mx-auto text-rose-600" />
              <p className="mt-3 text-lg font-bold text-rose-800">Receipt not found</p>
              <p className="mt-1 text-sm text-rose-700">
                No payment exists with ID <span className="font-mono">{txn}</span>. This receipt may be fake — do not accept it.
              </p>
            </div>
          )}

          {r && (
            <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 bg-emerald-600 px-5 py-4 text-white">
                <BadgeCheck size={32} />
                <div>
                  <p className="text-lg font-bold">Genuine receipt</p>
                  <p className="text-sm text-emerald-50">This payment is recorded in the system.</p>
                </div>
              </div>
              <div className="flex items-baseline justify-between border-b border-slate-100 px-5 py-4">
                <span className="text-sm text-slate-500">Total paid</span>
                <span className="text-2xl font-bold text-slate-900">{taka(r.totalAmount)}</span>
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                {rowsData.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-5 py-2.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
