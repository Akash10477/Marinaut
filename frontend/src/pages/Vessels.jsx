import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks'
import { Alert, Badge, Button, Card, Modal, PageHeader, Pagination, Spinner, Table } from '../components/ui'
import VesselForm from '../components/VesselForm'
import { VESSEL_TYPES, capacityText } from '../utils/format'

export default function Vessels() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const isStaff = user.role !== 'owner'

  const [search, setSearch] = useState('')
  const [q, setQ] = useState({ search: '', status: '', vesselType: '', page: 1 })
  const [showAdd, setShowAdd] = useState(false)

  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString()
  const { data, loading, error, reload } = useFetch(`/vessels?${params}`)

  const columns = [
    {
      key: 'vesselName',
      label: 'Vessel',
      render: (v) => (
        <div>
          <p className="font-medium text-slate-800">{v.vesselName}</p>
          <p className="font-mono text-xs text-slate-500">{v.registrationNumber}</p>
        </div>
      ),
    },
    { key: 'vesselType', label: 'Type' },
    { key: 'route', label: 'Route', render: (v) => v.route || '—' },
    { key: 'capacity', label: 'Capacity', render: (v) => capacityText(v) },
    ...(isStaff ? [{ key: 'owner', label: 'Owner', render: (v) => v.owner?.name }] : []),
    { key: 'status', label: 'Status', render: (v) => <Badge>{v.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title={isStaff ? 'Vessels' : 'My vessels'}
        subtitle={isStaff ? 'All registered vessels' : 'Vessels registered under your account'}
        action={
          user.role !== 'police' && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add vessel
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row">
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              setQ({ ...q, search, page: 1 })
            }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or registration no. and press Enter"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy-500"
            />
          </form>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={q.vesselType} onChange={(e) => setQ({ ...q, vesselType: e.target.value, page: 1 })}>
            <option value="">All types</option>
            {VESSEL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value, page: 1 })}>
            <option value="">All status</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </div>
        <Alert>{error}</Alert>
        {loading && !data ? (
          <Spinner />
        ) : (
          <>
            <Table columns={columns} rows={data?.items || []} onRowClick={(v) => navigate(`/app/vessels/${v._id}`)} empty="No vessels found" />
            <Pagination pagination={data?.pagination} onPage={(page) => setQ({ ...q, page })} />
          </>
        )}
      </Card>

      <Modal open={showAdd} title="Add vessel" onClose={() => setShowAdd(false)}>
        <VesselForm
          askOwner={isStaff}
          onSaved={() => {
            setShowAdd(false)
            toast('Vessel added successfully')
            reload()
          }}
        />
      </Modal>
    </div>
  )
}
