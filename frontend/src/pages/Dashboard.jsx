import { Link } from 'react-router-dom'
import { Ship, FileWarning, Wallet, AlertTriangle, CheckCircle2, Users, FilePlus2, UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks'
import { Alert, Card, CardHeader, PageHeader, Spinner, StatCard, Empty } from '../components/ui'
import FineTable from '../components/FineTable'
import { BarList, ColumnChart } from '../components/charts'
import { taka } from '../utils/format'

function StaffDashboard({ d, role }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collected" value={taka(d.totalCollected)} sub={`${d.fines.Paid.count} fines paid`} icon={Wallet} tone="green" />
        <StatCard label="Outstanding" value={taka(d.totalOutstanding)} sub={`${d.fines.Unpaid.count} unpaid · incl. ${taka(d.lateFeesAccrued)} late fees`} icon={FileWarning} tone="amber" />
        <StatCard label="Overdue fines" value={d.overdue} sub="Past due date" icon={AlertTriangle} tone="red" />
        <StatCard label="Registered vessels" value={d.vessels.total} sub={`${d.vessels.suspended} suspended`} icon={Ship} tone="navy" />
      </div>

      {role === 'admin' && d.pendingApprovals > 0 && (
        <div className="mt-4">
          <Alert type="info">
            <span className="inline-flex items-center gap-2">
              <UserCheck size={16} /> {d.pendingApprovals} Naval Police registration(s) waiting for approval —{' '}
              <Link to="/app/users?tab=pending" className="font-semibold underline">
                review now
              </Link>
            </span>
          </Alert>
        </div>
      )}

      {role === 'admin' && d.users && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Naval Police" value={d.users.police} sub={d.pendingApprovals ? `${d.pendingApprovals} pending approval` : undefined} icon={Users} tone="slate" />
          <StatCard label="Vessel owners" value={d.users.owner} icon={Users} tone="slate" />
          <StatCard label="Cancelled fines" value={d.fines.Cancelled.count} icon={CheckCircle2} tone="slate" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Collection — last 6 months"
            subtitle={`${taka(d.monthlyCollection.reduce((s, m) => s + m.amount, 0))} collected in this period`}
          />
          <ColumnChart data={d.monthlyCollection.map((m) => ({ ...m, value: m.amount }))} format={taka} ariaLabel="Fine collection per month for the last 6 months" />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Top violations" subtitle="Most frequent offences (excluding cancelled)" />
          {d.topViolations.length ? <BarList items={d.topViolations} format={taka} /> : <Empty text="No fines yet" />}
        </Card>
      </div>
    </>
  )
}

function OwnerDashboard({ d }) {
  return (
    <>
      {d.overdue > 0 && (
        <div className="mb-4">
          <Alert>
            You have {d.overdue} overdue fine(s). They grow by 5% (repeat offence: 10%) every 30 days until paid —{' '}
            <Link to="/app/fines?status=Overdue" className="font-semibold underline">
              pay now
            </Link>
            .
          </Alert>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My vessels" value={d.vessels.total} icon={Ship} tone="navy" />
        <StatCard label="Amount due" value={taka(d.totalDue)} sub={d.lateFeesAccrued ? `incl. ${taka(d.lateFeesAccrued)} late fees` : `${d.fines.Unpaid.count} unpaid`} icon={FileWarning} tone="amber" />
        <StatCard label="Overdue" value={d.overdue} icon={AlertTriangle} tone="red" />
        <StatCard label="Total paid" value={taka(d.totalPaid)} sub={`${d.fines.Paid.count} fines`} icon={CheckCircle2} tone="green" />
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error } = useFetch('/dashboard')

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle={
          user.role === 'owner' ? 'Overview of your vessels and fines' : 'System overview of fines and collections'
        }
        action={
          user.role !== 'owner' ? (
            <Link to="/app/fines/new" className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              <FilePlus2 size={16} /> Issue fine
            </Link>
          ) : (
            <Link to="/app/vessels" className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              <Ship size={16} /> My vessels
            </Link>
          )
        }
      />
      <Alert>{error}</Alert>
      {loading && !data ? (
        <Spinner />
      ) : data ? (
        <>
          {data.role === 'owner' ? <OwnerDashboard d={data} /> : <StaffDashboard d={data} role={data.role} />}
          <Card className="mt-6">
            <CardHeader
              title="Recent fines"
              action={
                <Link to="/app/fines" className="text-sm font-medium text-navy-600 hover:underline">
                  View all
                </Link>
              }
            />
            <FineTable fines={data.recentFines} compact />
          </Card>
        </>
      ) : null}
    </div>
  )
}
