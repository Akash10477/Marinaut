import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ship, AlertTriangle } from 'lucide-react'
import api, { errMsg } from '../api/client'
import { useFetch } from '../hooks'
import { useToast } from '../context/ToastContext'
import { Alert, Badge, Button, Card, Input, PageHeader, Select, Textarea } from '../components/ui'
import { capacityText, taka, LATE_FEE_RULE } from '../utils/format'

export default function IssueFine() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: vData } = useFetch('/violations?active=true')
  const violations = vData?.items || []

  const [form, setForm] = useState({ registrationNumber: params.get('reg') || '', violationId: '', location: '', notes: '' })
  const [vessel, setVessel] = useState(null)
  const [vesselErr, setVesselErr] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Show vessel info as the registration number is typed (public lookup API)
  useEffect(() => {
    const reg = form.registrationNumber.trim()
    setVessel(null)
    setVesselErr('')
    if (reg.length < 3) return undefined
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/public/fines/${encodeURIComponent(reg)}`)
        setVessel(data)
      } catch (err) {
        setVesselErr(errMsg(err))
      }
    }, 400)
    return () => clearTimeout(t)
  }, [form.registrationNumber])

  const selected = violations.find((v) => v._id === form.violationId)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/fines', form)
      toast(data.message)
      navigate(`/app/fines/${data.fine._id}`)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Issue fine" subtitle={`Record a violation on the spot. Repeat offences within 1 year are charged 2×. Unpaid after the due date, fines grow ${LATE_FEE_RULE.normal}% (repeat: ${LATE_FEE_RULE.repeat}%) every ${LATE_FEE_RULE.intervalDays} days.`} />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <Alert>{error}</Alert>

          <div>
            <Input
              label="Vessel registration number"
              required
              value={form.registrationNumber}
              onChange={set('registrationNumber')}
              placeholder="M-15245"
              className="uppercase"
            />
            {vessel && (
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-navy-50 px-4 py-3 text-sm">
                <Ship size={18} className="text-navy-600" />
                <span className="font-medium text-navy-900">{vessel.vessel.vesselName}</span>
                <span className="text-slate-500">{vessel.vessel.vesselType}</span>
                {vessel.vessel.capacity != null && <span className="text-slate-500">· Capacity {capacityText(vessel.vessel)}</span>}
                <Badge>{vessel.vessel.status}</Badge>
                {vessel.unpaidCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-700">
                    <AlertTriangle size={14} /> {vessel.unpaidCount} unpaid ({taka(vessel.totalPayable)})
                  </span>
                )}
              </div>
            )}
            {vesselErr && <p className="mt-2 text-sm text-rose-600">{vesselErr}</p>}
          </div>

          <Select label="Violation" required value={form.violationId} onChange={set('violationId')}>
            <option value="">Select a violation…</option>
            {violations.map((v) => (
              <option key={v._id} value={v._id}>
                {v.code} — {v.title} ({taka(v.amount)})
              </option>
            ))}
          </Select>
          {selected && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Badge>{selected.severity}</Badge>
              <span>{selected.description}</span>
            </div>
          )}

          <Input label="Location" required value={form.location} onChange={set('location')} placeholder="Sadarghat Terminal, Dhaka" />
          <Textarea label="Notes (optional)" value={form.notes} onChange={set('notes')} placeholder="e.g. 950 passengers found against capacity of 800" />

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">
              Base amount: <b className="text-slate-900">{selected ? taka(selected.amount) : '—'}</b>
            </p>
            <Button type="submit" loading={loading} disabled={!vessel}>
              Issue fine
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
