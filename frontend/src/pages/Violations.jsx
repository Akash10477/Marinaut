import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import api, { errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks'
import { Alert, Badge, Button, Card, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../components/ui'
import { taka } from '../utils/format'

function ViolationForm({ violation, onSaved }) {
  const editing = Boolean(violation)
  const [form, setForm] = useState({
    code: violation?.code || '',
    title: violation?.title || '',
    description: violation?.description || '',
    amount: violation?.amount ?? '',
    severity: violation?.severity || 'Minor',
    isActive: violation?.isActive ?? true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const body = { ...form, amount: Number(form.amount), isActive: form.isActive === true || form.isActive === 'true' }
    try {
      if (editing) {
        delete body.code
        await api.patch(`/violations/${violation._id}`, body)
      } else {
        await api.post('/violations', body)
      }
      onSaved()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error}</Alert>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Code" required disabled={editing} value={form.code} onChange={set('code')} placeholder="V11" className="uppercase" />
        <div className="sm:col-span-2">
          <Input label="Title" required value={form.title} onChange={set('title')} />
        </div>
      </div>
      <Textarea label="Description" value={form.description} onChange={set('description')} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Amount (৳)" type="number" min="0" required value={form.amount} onChange={set('amount')} />
        <Select label="Severity" value={form.severity} onChange={set('severity')}>
          <option>Minor</option>
          <option>Major</option>
          <option>Critical</option>
        </Select>
        <Select label="Status" value={String(form.isActive)} onChange={set('isActive')}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>
      {editing && <p className="text-xs text-slate-500">Changing the amount only affects new fines. Existing fines keep their original amount.</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          {editing ? 'Save changes' : 'Create violation'}
        </Button>
      </div>
    </form>
  )
}

export default function Violations() {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user.role === 'admin'
  const { data, loading, error, reload } = useFetch('/violations')
  const [modal, setModal] = useState(null) // null | 'new' | violation object

  const columns = [
    { key: 'code', label: 'Code', render: (v) => <span className="font-mono font-medium">{v.code}</span> },
    {
      key: 'title',
      label: 'Violation',
      render: (v) => (
        <div className="max-w-md whitespace-normal">
          <p className="font-medium text-slate-800">{v.title}</p>
          <p className="text-xs text-slate-500">{v.description}</p>
        </div>
      ),
    },
    { key: 'severity', label: 'Severity', render: (v) => <Badge>{v.severity}</Badge> },
    { key: 'amount', label: 'Fine', className: 'text-right', render: (v) => <span className="font-semibold">{taka(v.amount)}</span> },
    { key: 'isActive', label: 'Status', render: (v) => <Badge>{v.isActive ? 'Active' : 'Inactive'}</Badge> },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            label: '',
            render: (v) => (
              <Button variant="ghost" size="sm" onClick={() => setModal(v)}>
                <Pencil size={14} /> Edit
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Violation types"
        subtitle="Offence catalog with standard fine amounts"
        action={
          isAdmin && (
            <Button onClick={() => setModal('new')}>
              <Plus size={16} /> New violation
            </Button>
          )
        }
      />
      <Card>
        <Alert>{error}</Alert>
        {loading && !data ? <Spinner /> : <Table columns={columns} rows={data?.items || []} empty="No violation types yet" />}
      </Card>

      <Modal open={Boolean(modal)} title={modal === 'new' ? 'New violation' : 'Edit violation'} onClose={() => setModal(null)}>
        <ViolationForm
          key={modal?._id || 'new'}
          violation={modal === 'new' ? null : modal}
          onSaved={() => {
            setModal(null)
            toast('Violation saved')
            reload()
          }}
        />
      </Modal>
    </div>
  )
}
