import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, XCircle, Receipt, Banknote, TrendingUp, Clock, FileDown } from 'lucide-react'
import { downloadFineNoticePdf } from '../utils/pdf'
import api, { errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks'
import { Alert, Badge, Button, Card, CardHeader, Modal, Spinner, Textarea } from '../components/ui'
import { date, dateTime, fineStatus, taka, PAYMENT_METHODS, LATE_FEE_RULE } from '../utils/format'

function PayModal({ open, onClose, fine, lateFee, onPaid, cash }) {
  const [method, setMethod] = useState(cash ? 'Cash' : 'bKash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const total = fine.amount + lateFee

  const pay = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/payments/fine/${fine._id}`, { method })
      onPaid(data)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={cash ? 'Record cash payment' : 'Pay fine'}>
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Fine amount</span>
            <span>{taka(fine.amount)}</span>
          </div>
          {lateFee > 0 && (
            <div className="flex justify-between py-1 text-rose-600">
              <span>
                Late fee ({fine.lateFeeInfo.periods} × {fine.lateFeeInfo.ratePercent}%)
              </span>
              <span>+ {taka(lateFee)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{taka(total)}</span>
          </div>
        </div>

        {!cash && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Payment method</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    method === m
                      ? 'border-navy-600 bg-navy-50 text-navy-800 ring-2 ring-navy-100'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Demo mode: payment is simulated, no real money is charged.</p>
          </div>
        )}

        <Button className="w-full" size="lg" variant="success" loading={loading} onClick={pay}>
          {cash ? `Confirm ${taka(total)} received` : `Pay ${taka(total)} with ${method}`}
        </Button>
      </div>
    </Modal>
  )
}

function CancelModal({ open, onClose, fineId, onDone }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cancel = async () => {
    setLoading(true)
    setError('')
    try {
      await api.patch(`/fines/${fineId}/cancel`, { reason })
      onDone()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cancel fine">
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Textarea
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this fine being cancelled?"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Keep fine
          </Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={cancel}>
            Cancel fine
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Shows the payment deadline and how the late fee is growing
function LateFeePanel({ fine }) {
  const info = fine.lateFeeInfo
  const rate = fine.isRepeatOffence ? LATE_FEE_RULE.repeat : LATE_FEE_RULE.normal
  const perPeriod = Math.round((fine.amount * rate) / 100)

  if (!info.periods) {
    const daysLeft = Math.max(Math.ceil((new Date(fine.dueDate) - new Date()) / 86400000), 0)
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Clock size={18} className="shrink-0" />
        <span>
          Pay by <b>{date(fine.dueDate)}</b> ({daysLeft} day{daysLeft === 1 ? '' : 's'} left). After that, the fine grows by{' '}
          <b>{rate}%</b> ({taka(perPeriod)}) every {LATE_FEE_RULE.intervalDays} days
          {fine.isRepeatOffence ? ' — higher rate because this is a repeat offence' : ''}.
        </span>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div className="flex items-center gap-2 font-semibold">
        <TrendingUp size={18} /> Overdue by {info.daysOverdue} day{info.daysOverdue === 1 ? '' : 's'} — the fine is increasing
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-rose-700/80">Base fine</p>
          <p className="font-semibold">{taka(fine.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-rose-700/80">
            Late fee ({info.periods} × {info.ratePercent}%)
          </p>
          <p className="font-semibold">+ {taka(info.lateFee)}</p>
        </div>
        <div>
          <p className="text-xs text-rose-700/80">Payable now</p>
          <p className="text-base font-bold">{taka(fine.totalPayable)}</p>
        </div>
        <div>
          <p className="text-xs text-rose-700/80">Next +{info.ratePercent}% on</p>
          <p className="font-semibold">{date(info.nextIncreaseAt)}</p>
        </div>
      </div>
    </div>
  )
}

export default function FineDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useFetch(`/fines/${id}`)
  const [modal, setModal] = useState(null) // 'pay' | 'cash' | 'cancel'

  if (loading && !data) return <Spinner />
  if (error) return <Alert>{error}</Alert>
  const { fine, lateFee } = data
  const status = fineStatus(fine)

  const rows = [
    ['Violation', `${fine.violationCode} — ${fine.violationTitle}`],
    ['Severity', fine.violation?.severity ? <Badge key="sev">{fine.violation.severity}</Badge> : '—'],
    ['Location', fine.location],
    ['Issued by', `${fine.issuedBy?.name || '—'}${fine.issuedBy?.badgeNumber ? ` (${fine.issuedBy.badgeNumber})` : ''}`],
    ['Issued at', dateTime(fine.issuedAt)],
    ['Due date', date(fine.dueDate)],
    ['Notes', fine.notes || '—'],
  ]
  if (fine.status === 'Paid') rows.push(['Paid at', dateTime(fine.paidAt)])
  if (fine.status === 'Cancelled') rows.push(['Cancel reason', fine.cancelReason])

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/app/fines" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to fines
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{fine.fineNumber}</p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{taka(fine.amount)}</h1>
            <Badge>{status}</Badge>
            {fine.isRepeatOffence && <Badge tone="Repeat">Repeat offence · 2×</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {fine.status === 'Unpaid' && user.role === 'owner' && (
            <Button variant="success" onClick={() => setModal('pay')}>
              <CreditCard size={16} /> Pay {taka(fine.amount + lateFee)}
            </Button>
          )}
          {fine.status === 'Unpaid' && user.role === 'admin' && (
            <>
              <Button variant="secondary" onClick={() => setModal('cash')}>
                <Banknote size={16} /> Record cash payment
              </Button>
              <Button variant="danger" onClick={() => setModal('cancel')}>
                <XCircle size={16} /> Cancel fine
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => downloadFineNoticePdf(fine)}>
            <FileDown size={16} /> Fine notice PDF
          </Button>
          {fine.payment && (
            <Link
              to={`/app/receipts/${fine.payment._id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Receipt size={16} /> View receipt
            </Link>
          )}
        </div>
      </div>

      {fine.status === 'Unpaid' && <LateFeePanel fine={fine} />}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="Fine details" />
          <dl className="divide-y divide-slate-100 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-4 px-5 py-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="col-span-2 text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardHeader title="Vessel" />
          <div className="space-y-1 p-5 text-sm">
            <p className="font-semibold text-slate-900">{fine.vessel?.vesselName}</p>
            <p className="font-mono text-slate-500">{fine.vessel?.registrationNumber}</p>
            <p className="text-slate-500">{fine.vessel?.vesselType}</p>
            <div className="pt-2">
              <Badge>{fine.vessel?.status}</Badge>
            </div>
            <Link
              to={`/app/vessels/${fine.vessel?._id}`}
              className="mt-3 inline-block text-sm font-medium text-navy-600 hover:underline"
            >
              View vessel →
            </Link>
          </div>
        </Card>
      </div>

      <PayModal
        open={modal === 'pay' || modal === 'cash'}
        cash={modal === 'cash'}
        key={modal}
        onClose={() => setModal(null)}
        fine={fine}
        lateFee={lateFee}
        onPaid={() => {
          setModal(null)
          toast('Payment successful')
          reload()
        }}
      />
      <CancelModal
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        fineId={fine._id}
        onDone={() => {
          setModal(null)
          toast('Fine cancelled')
          reload()
        }}
      />
    </div>
  )
}
