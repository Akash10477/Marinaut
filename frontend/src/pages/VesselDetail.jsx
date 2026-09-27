import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Ban, CheckCircle2, Trash2, FilePlus2 } from 'lucide-react'
import api, { errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks'
import { Alert, Badge, Button, Card, CardHeader, Modal, Spinner, StatCard } from '../components/ui'
import FineTable from '../components/FineTable'
import VesselForm from '../components/VesselForm'
import ForceDeleteModal from '../components/ForceDeleteModal'
import { capacityText, date, taka } from '../utils/format'

export default function VesselDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useFetch(`/vessels/${id}`)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [force, setForce] = useState(null) // vessel with fines -> type-to-confirm

  if (loading && !data) return <Spinner />
  if (error) return <Alert>{error}</Alert>
  const { vessel, fineSummary, fines } = data

  const setStatus = async (status) => {
    setBusy(true)
    try {
      await api.patch(`/vessels/${id}/status`, { status })
      toast(`Vessel ${status === 'Active' ? 'activated' : 'suspended'}`)
      reload()
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this vessel permanently?')) return
    try {
      const { data } = await api.delete(`/vessels/${id}`)
      toast(data.message)
      navigate('/app/vessels')
    } catch (err) {
      if (err.response?.data?.canForce) setForce(err.response.data)
      else toast(errMsg(err), 'error')
    }
  }

  const forceRemove = async (confirm) => {
    const { data } = await api.delete(`/vessels/${id}`, { params: { force: true, confirm } })
    toast(data.message)
    navigate('/app/vessels')
  }

  const info = [
    ['Registration no.', <span key="reg" className="font-mono">{vessel.registrationNumber}</span>],
    ['Type', vessel.vesselType],
    ['Route', vessel.route || '—'],
    ['Capacity', capacityText(vessel)],
    ['Owner', vessel.owner?.name],
    ['Owner contact', [vessel.owner?.email, vessel.owner?.phone].filter(Boolean).join(' · ')],
    ['Registered on', date(vessel.createdAt)],
  ]

  return (
    <div>
      <Link to="/app/vessels" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to vessels
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{vessel.vesselName}</h1>
            <Badge>{vessel.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{vessel.registrationNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role !== 'owner' && (
            <Link
              to={`/app/fines/new?reg=${vessel.registrationNumber}`}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              <FilePlus2 size={16} /> Issue fine
            </Link>
          )}
          {user.role !== 'police' && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Edit
            </Button>
          )}
          {user.role === 'admin' &&
            (vessel.status === 'Active' ? (
              <Button variant="danger" loading={busy} onClick={() => setStatus('Suspended')}>
                <Ban size={16} /> Suspend
              </Button>
            ) : (
              <Button variant="success" loading={busy} onClick={() => setStatus('Active')}>
                <CheckCircle2 size={16} /> Activate
              </Button>
            ))}
          {user.role === 'admin' && (
            <Button variant="ghost" onClick={remove} title="Delete vessel" className="!text-rose-600 hover:!bg-rose-50">
              <Trash2 size={16} /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total fines" value={fineSummary.total} tone="navy" />
        <StatCard label="Amount due" value={taka(fineSummary.totalDue)} sub={`${fineSummary.unpaid} unpaid`} tone="amber" />
        <StatCard label="Overdue" value={fineSummary.overdue} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Vessel details" />
          <dl className="divide-y divide-slate-100 text-sm">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Fine history" />
          <FineTable fines={fines.map((f) => ({ ...f, vessel }))} compact />
        </Card>
      </div>

      {force && (
        <ForceDeleteModal title={`Delete ${vessel.vesselName}?`} info={force} onConfirm={forceRemove} onClose={() => setForce(null)} />
      )}
      <Modal open={editing} title="Edit vessel" onClose={() => setEditing(false)}>
        <VesselForm
          vessel={vessel}
          onSaved={() => {
            setEditing(false)
            toast('Vessel updated')
            reload()
          }}
        />
      </Modal>
    </div>
  )
}
