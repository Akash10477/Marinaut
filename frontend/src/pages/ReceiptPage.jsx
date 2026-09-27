import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle2, Download } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { useFetch } from '../hooks'
import { Alert, Button, Spinner } from '../components/ui'
import { dateTime, date, taka } from '../utils/format'
import { useToast } from '../context/ToastContext'
import { downloadReceiptPdf, qrDataUrl, verifyUrl } from '../utils/pdf'

export default function ReceiptPage() {
  const { id } = useParams()
  const { data, loading, error } = useFetch(`/payments/${id}`)
  const toast = useToast()
  const [qr, setQr] = useState('')
  const [downloading, setDownloading] = useState(false)
  const txn = data?.payment?.transactionId

  // QR image shown on screen
  useEffect(() => {
    if (txn) qrDataUrl(verifyUrl(txn)).then(setQr)
  }, [txn])

  const download = async () => {
    setDownloading(true)
    try {
      await downloadReceiptPdf(data.payment)
    } catch {
      toast('Could not create PDF', 'error')
    } finally {
      setDownloading(false)
    }
  }

  if (loading && !data) return <Spinner />
  if (error) return <Alert>{error}</Alert>
  const p = data.payment
  const f = p.fine

  const rows = [
    ['Transaction ID', <span key="tx" className="font-mono">{p.transactionId}</span>],
    ['Payment method', p.method],
    ['Paid at', dateTime(p.paidAt)],
    ['Paid by', p.paidBy?.name],
    ['Fine number', <span key="fn" className="font-mono">{f.fineNumber}</span>],
    ['Vessel', `${f.vessel?.vesselName} (${f.vessel?.registrationNumber})`],
    ['Violation', f.violationTitle],
    ['Location', f.location],
    ['Issued', `${date(f.issuedAt)} by ${f.issuedBy?.name || '—'}`],
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/app/payments" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Back to payments
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </Button>
          <Button onClick={download} loading={downloading}>
            <Download size={16} /> Download PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-6">
          <div className="flex items-center gap-2">
            <LogoMark size={40} />
            <div>
              <p className="font-extrabold tracking-[0.12em] text-slate-900">MARINAUT</p>
              <p className="text-xs text-slate-500">Official payment receipt</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <CheckCircle2 size={18} /> PAID
          </div>
        </div>

        <dl className="divide-y divide-slate-100 py-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Fine amount</span>
            <span>{taka(p.fineAmount)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Late fee</span>
            <span>{taka(p.lateFee)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
            <span>Total paid</span>
            <span>{taka(p.totalAmount)}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 border-t border-dashed border-slate-300 pt-6 text-center sm:flex-row sm:text-left">
          {qr && <img src={qr} alt="Receipt verification QR code" className="h-28 w-28 rounded-lg border border-slate-200 p-1" />}
          <div className="sm:pl-3">
            <p className="text-sm font-semibold text-slate-800">Scan to verify this receipt</p>
            <p className="mt-1 text-xs text-slate-500">Anyone (e.g. Naval Police at the ghat) can scan this code to confirm the payment is genuine.</p>
            <Link to={`/verify/${p.transactionId}`} target="_blank" className="mt-1 inline-block break-all text-xs font-medium text-navy-600 hover:underline print:hidden">
              {verifyUrl(p.transactionId)}
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">This is a system-generated receipt and does not require a signature.</p>
      </div>
    </div>
  )
}
