import { useState } from 'react'
import api, { errMsg } from '../api/client'
import { Lock } from 'lucide-react'
import { Alert, Button, Field, Input, Select } from './ui'
import { VESSEL_TYPES, REG_PATTERN, UNIT_BY_TYPE } from '../utils/format'

// Used for both add and edit. Passing a vessel switches to edit mode.
export default function VesselForm({ vessel, askOwner, onSaved }) {
  const editing = Boolean(vessel)
  const [form, setForm] = useState({
    vesselName: vessel?.vesselName || '',
    registrationNumber: vessel?.registrationNumber || '',
    vesselType: vessel?.vesselType || 'Launch',
    route: vessel?.route || '',
    capacity: vessel?.capacity ?? '',
    capacityUnit: vessel?.capacityUnit || 'passengers',
    ownerEmail: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Launch/Passenger/Boat -> passengers, Cargo/Tanker -> tons (locked). Other -> owner chooses
  const lockedUnit = UNIT_BY_TYPE[form.vesselType]
  const unit = lockedUnit || form.capacityUnit

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const body = { ...form, capacityUnit: unit, capacity: form.capacity === '' ? undefined : Number(form.capacity) }
    if (!askOwner) delete body.ownerEmail
    try {
      const { data } = editing ? await api.patch(`/vessels/${vessel._id}`, body) : await api.post('/vessels', body)
      onSaved(data)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error}</Alert>
      <Input label="Vessel name" required value={form.vesselName} onChange={set('vesselName')} placeholder="MV Sundarban 10" />
      <Input
        label="Registration number"
        required
        disabled={editing}
        value={form.registrationNumber}
        onChange={set('registrationNumber')}
        placeholder="M-15245"
        pattern={REG_PATTERN}
        title="Format: one letter, a dash, then digits (e.g. M-15245)"
        hint={editing ? 'Registration number cannot be changed' : 'Format: one letter, a dash, then digits (e.g. M-15245)'}
        className="uppercase"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Type" value={form.vesselType} onChange={set('vesselType')}>
          {VESSEL_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Field label={`Capacity (${lockedUnit ? (lockedUnit === 'tons' ? 'tons' : 'passengers') : 'choose unit'})`}>
          <div className="flex">
            <input
              type="number"
              min="0"
              value={form.capacity}
              onChange={set('capacity')}
              placeholder={unit === 'tons' ? 'e.g. 1200' : 'e.g. 800'}
              className="w-full min-w-0 rounded-l-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
            {lockedUnit ? (
              <span
                title={`Unit is fixed for ${form.vesselType}`}
                className="inline-flex items-center gap-1 rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 text-sm text-slate-600"
              >
                <Lock size={12} /> {lockedUnit}
              </span>
            ) : (
              <select
                value={form.capacityUnit}
                onChange={set('capacityUnit')}
                className="rounded-r-lg border border-l-0 border-slate-300 bg-white px-2 text-sm outline-none"
              >
                <option value="passengers">passengers</option>
                <option value="tons">tons</option>
              </select>
            )}
          </div>
        </Field>
      </div>
      <Input label="Route" value={form.route} onChange={set('route')} placeholder="Dhaka - Barishal" />
      {askOwner && !editing && (
        <Input
          label="Owner email"
          type="email"
          required
          value={form.ownerEmail}
          onChange={set('ownerEmail')}
          hint="The owner must already have an account"
        />
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          {editing ? 'Save changes' : 'Add vessel'}
        </Button>
      </div>
    </form>
  )
}
