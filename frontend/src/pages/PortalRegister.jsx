import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../api/client'
import { Alert, Button, Input } from '../components/ui'
import { PORTALS } from '../portals'
import AuthLayout from './AuthLayout'

export default function PortalRegister({ portal }) {
  const p = PORTALS[portal]
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', badgeNumber: '', adminKey: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const { confirm, ...body } = form // eslint-disable-line no-unused-vars
    try {
      const data = await register(portal, body)
      // Naval Police: no token (approval pending) -> go to login with a message
      navigate(data.token ? '/app' : `${p.loginPath}?registered=1`, { replace: true })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      portal={portal}
      title="Create account"
      subtitle={p.registerSubtitle}
      footer={
        <>
          Already have an account?{' '}
          <Link to={p.loginPath} className="font-medium text-white underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Input
          label={portal === 'owner' ? 'Full name / company name' : 'Full name'}
          required
          value={form.name}
          onChange={set('name')}
        />
        <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
        <div className={portal === 'police' ? 'grid gap-4 sm:grid-cols-2' : ''}>
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" />
          {portal === 'police' && (
            <Input label="Badge / service number" required value={form.badgeNumber} onChange={set('badgeNumber')} placeholder="NP-1021" />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" required minLength={6} value={form.password} onChange={set('password')} hint="At least 6 characters" />
          <Input label="Confirm password" type="password" required minLength={6} value={form.confirm} onChange={set('confirm')} />
        </div>
        {portal === 'admin' && (
          <Input
            label="Admin registration key"
            type="password"
            required
            value={form.adminKey}
            onChange={set('adminKey')}
            hint="Provided by the system administrator"
          />
        )}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {portal === 'police' ? 'Submit for approval' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
