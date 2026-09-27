import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilePlus2, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks'
import { Alert, Card, PageHeader, Pagination, Spinner } from '../components/ui'
import FineTable from '../components/FineTable'

const TABS = ['All', 'Unpaid', 'Overdue', 'Paid', 'Cancelled']

export default function Fines() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const page = params.get('page') || '1'
  const searchQ = params.get('search') || ''
  const [search, setSearch] = useState(searchQ)

  const query = new URLSearchParams({ page, ...(status && { status }), ...(searchQ && { search: searchQ }) })
  const { data, loading, error } = useFetch(`/fines?${query}`)

  const update = (changes) => {
    const next = { status, search: searchQ, page: '1', ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== 'All')))
  }

  return (
    <div>
      <PageHeader
        title={user.role === 'owner' ? 'My fines' : 'Fines'}
        subtitle={user.role === 'owner' ? 'Fines issued to your vessels' : 'All fines issued in the system'}
        action={
          user.role !== 'owner' && (
            <Link to="/app/fines/new" className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              <FilePlus2 size={16} /> Issue fine
            </Link>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => {
              const active = (status || 'All') === t
              return (
                <button
                  key={t}
                  onClick={() => update({ status: t })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? 'bg-navy-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <form
            className="relative lg:w-80"
            onSubmit={(e) => {
              e.preventDefault()
              update({ search })
            }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vessel name or reg. no."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy-500"
            />
          </form>
        </div>
        <Alert>{error}</Alert>
        {loading && !data ? (
          <Spinner />
        ) : (
          <>
            <FineTable fines={data?.items || []} />
            <Pagination pagination={data?.pagination} onPage={(p) => update({ page: String(p) })} />
          </>
        )}
      </Card>
    </div>
  )
}
