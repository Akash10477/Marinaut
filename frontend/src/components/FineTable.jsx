import { useNavigate } from 'react-router-dom'
import { Badge, Table } from './ui'
import { date, fineStatus, taka } from '../utils/format'

export default function FineTable({ fines, compact = false }) {
  const navigate = useNavigate()
  const columns = [
    { key: 'fineNumber', label: 'Fine No.', render: (f) => <span className="font-mono text-xs">{f.fineNumber}</span> },
    {
      key: 'vessel',
      label: 'Vessel',
      render: (f) => (
        <div>
          <p className="font-medium text-slate-800">{f.vessel?.vesselName}</p>
          <p className="text-xs text-slate-500">{f.vessel?.registrationNumber}</p>
        </div>
      ),
    },
    {
      key: 'violation',
      label: 'Violation',
      render: (f) => (
        <div className="flex items-center gap-1.5">
          <span className="max-w-[220px] truncate">{f.violationTitle}</span>
          {f.isRepeatOffence && <Badge tone="Repeat">Repeat</Badge>}
        </div>
      ),
    },
    ...(compact
      ? []
      : [{ key: 'location', label: 'Location', render: (f) => <span className="text-slate-500">{f.location}</span> }]),
    { key: 'issuedAt', label: 'Issued', render: (f) => date(f.issuedAt) },
    {
      key: 'amount',
      label: 'Amount',
      className: 'text-right',
      render: (f) =>
        f.lateFee > 0 ? (
          <div>
            <p className="font-semibold text-rose-700">{taka(f.totalPayable)}</p>
            <p className="text-xs text-slate-500">
              {taka(f.amount)} + {f.lateFeeInfo.periods}×{f.lateFeeInfo.ratePercent}%
            </p>
          </div>
        ) : (
          <span className="font-medium">{taka(f.amount)}</span>
        ),
    },
    { key: 'status', label: 'Status', render: (f) => <Badge>{fineStatus(f)}</Badge> },
  ]
  return <Table columns={columns} rows={fines} onRowClick={(f) => navigate(`/app/fines/${f._id}`)} empty="No fines found" />
}
