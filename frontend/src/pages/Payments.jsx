import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFetch } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { Alert, Badge, Card, PageHeader, Pagination, Spinner, Table } from '../components/ui'
import { dateTime, taka } from '../utils/format'

export default function Payments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, loading, error } = useFetch(`/payments?page=${page}`)

  const columns = [
    { key: 'transactionId', label: 'Transaction', render: (p) => <span className="font-mono text-xs">{p.transactionId}</span> },
    { key: 'fine', label: 'Fine No.', render: (p) => <span className="font-mono text-xs">{p.fine?.fineNumber}</span> },
    {
      key: 'vessel',
      label: 'Vessel',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-800">{p.fine?.vessel?.vesselName}</p>
          <p className="text-xs text-slate-500">{p.fine?.vessel?.registrationNumber}</p>
        </div>
      ),
    },
    { key: 'method', label: 'Method', render: (p) => <Badge tone="police">{p.method}</Badge> },
    { key: 'paidAt', label: 'Paid at', render: (p) => dateTime(p.paidAt) },
    {
      key: 'total',
      label: 'Amount',
      className: 'text-right',
      render: (p) => (
        <div>
          <p className="font-semibold">{taka(p.totalAmount)}</p>
          {p.lateFee > 0 && <p className="text-xs text-rose-600">incl. {taka(p.lateFee)} late fee</p>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={user.role === 'owner' ? 'My payments' : 'Payments'} subtitle="Click a row to view the receipt" />
      <Card>
        <Alert>{error}</Alert>
        {loading && !data ? (
          <Spinner />
        ) : (
          <>
            <Table columns={columns} rows={data?.items || []} onRowClick={(p) => navigate(`/app/receipts/${p._id}`)} empty="No payments yet" />
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
