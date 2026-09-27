import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, Check, X, Search, Trash2 } from 'lucide-react'
import api, { errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks'
import { Alert, Badge, Button, Card, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui'
import { date, ROLE_LABEL } from '../utils/format'
import ForceDeleteModal from '../components/ForceDeleteModal'

function UserForm({ onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'police', badgeNumber: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/users', form)
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
      <Input label="Name" required value={form.name} onChange={set('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Role" value={form.role} onChange={set('role')}>
          <option value="police">Naval Police</option>
          <option value="admin">Admin</option>
          <option value="owner">Vessel Owner</option>
        </Select>
        {form.role === 'police' && (
          <Input label="Badge / service number" value={form.badgeNumber} onChange={set('badgeNumber')} placeholder="NP-1021" />
        )}
      </div>
      <Input label="Temporary password" type="password" required minLength={6} value={form.password} onChange={set('password')} />
      <p className="text-xs text-slate-500">Accounts created here are approved immediately.</p>
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </div>
    </form>
  )
}

// tab -> API filter
const TABS = [
  { key: '', label: 'All', query: {} },
  { key: 'pending', label: 'Pending approval', query: { role: 'police', approvalStatus: 'pending' } },
  { key: 'admin', label: 'Admin', query: { role: 'admin' } },
  { key: 'police', label: 'Naval Police', query: { role: 'police' } },
  { key: 'owner', label: 'Vessel Owner', query: { role: 'owner' } },
]

const approvalTone = { pending: 'Unpaid', approved: 'Active', rejected: 'Cancelled' }

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tabKey = params.get('tab') || ''
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // search 300ms after typing stops (not on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const tab = TABS.find((t) => t.key === tabKey) || TABS[0]
  const query = new URLSearchParams({ ...tab.query, page, ...(search && { search }) }).toString()
  const { data, loading, error, reload } = useFetch(`/users?${query}`)
  const { data: pendingData, reload: reloadPending } = useFetch('/users?role=police&approvalStatus=pending&limit=1')
  const pendingCount = pendingData?.pagination?.total || 0

  const refresh = () => {
    reload()
    reloadPending()
  }

  const toggle = async (u) => {
    try {
      await api.patch(`/users/${u._id}/status`, { isActive: !u.isActive })
      toast(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`)
      refresh()
    } catch (err) {
      toast(errMsg(err), 'error')
    }
  }

  const [force, setForce] = useState(null) // { user, info } -> owner that has records

  const remove = async (u) => {
    if (!window.confirm(`Remove ${u.name} (${u.email})? This cannot be undone.`)) return
    try {
      const { data } = await api.delete(`/users/${u._id}`)
      toast(data.message)
      refresh()
    } catch (err) {
      // If the owner has vessels/fines the backend returns canForce -> type-to-confirm dialog
      if (err.response?.data?.canForce) setForce({ user: u, info: err.response.data })
      else toast(errMsg(err), 'error')
    }
  }

  const forceRemove = async (confirm) => {
    const { data } = await api.delete(`/users/${force.user._id}`, { params: { force: true, confirm } })
    setForce(null)
    toast(data.message)
    refresh()
  }

  const decide = async (u, status) => {
    try {
      await api.patch(`/users/${u._id}/approval`, { status })
      toast(`${u.name} ${status}`)
      refresh()
    } catch (err) {
      toast(errMsg(err), 'error')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-slate-800">{u.name}</p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (u) => <Badge tone={u.role}>{ROLE_LABEL[u.role]}</Badge> },
    { key: 'badgeNumber', label: 'Badge', render: (u) => u.badgeNumber || '—' },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'createdAt', label: 'Joined', render: (u) => date(u.createdAt) },
    {
      key: 'status',
      label: 'Status',
      render: (u) =>
        u.approvalStatus && u.approvalStatus !== 'approved' ? (
          <Badge tone={approvalTone[u.approvalStatus]}>{u.approvalStatus === 'pending' ? 'Pending' : 'Rejected'}</Badge>
        ) : (
          <Badge>{u.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (u) => {
        if (u._id === me.id) return <span className="text-xs text-slate-400">You</span>
        const removeBtn = (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => remove(u)}
            title="Remove user"
            className="!text-rose-600 hover:!bg-rose-50"
          >
            <Trash2 size={14} />
          </Button>
        )
        if (u.approvalStatus === 'pending') {
          return (
            <div className="flex gap-1">
              <Button variant="success" size="sm" onClick={() => decide(u, 'approved')}>
                <Check size={14} /> Approve
              </Button>
              <Button variant="secondary" size="sm" onClick={() => decide(u, 'rejected')}>
                <X size={14} /> Reject
              </Button>
              {removeBtn}
            </div>
          )
        }
        if (u.approvalStatus === 'rejected') {
          return (
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" onClick={() => decide(u, 'approved')}>
                Approve
              </Button>
              {removeBtn}
            </div>
          )
        }
        return (
          <div className="flex gap-1">
            <Button variant={u.isActive ? 'ghost' : 'secondary'} size="sm" onClick={() => toggle(u)}>
              {u.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            {removeBtn}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Approve Naval Police registrations, search and manage accounts"
        action={
          <Button onClick={() => setOpen(true)}>
            <UserPlus size={16} /> Add user
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.key || 'all'}
                onClick={() => {
                  setPage(1)
                  setParams(t.key ? { tab: t.key } : {})
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab.key === t.key ? 'bg-navy-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
                {t.key === 'pending' && pendingCount > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-amber-950">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
          <div className="relative lg:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, phone or badge"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none focus:border-navy-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                title="Clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <Alert>{error}</Alert>
        {loading && !data ? (
          <Spinner />
        ) : (
          <>
            <Table
              columns={columns}
              rows={data?.items || []}
              empty={search ? `No users match "${search}"` : tab.key === 'pending' ? 'No pending registrations' : 'No users'}
            />
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </>
        )}
      </Card>
      {force && (
        <ForceDeleteModal
          title={`Remove ${force.user.name}?`}
          info={force.info}
          onConfirm={forceRemove}
          onClose={() => setForce(null)}
        />
      )}
      <Modal open={open} title="Add user" onClose={() => setOpen(false)}>
        <UserForm
          onSaved={() => {
            setOpen(false)
            toast('User created')
            refresh()
          }}
        />
      </Modal>
    </div>
  )
}
