import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../api/client'
import { Alert, Button, Input } from '../components/ui'
import { PORTALS } from '../portals'
import AuthLayout from './AuthLayout'

export default function PortalLogin({ portal }) {
  const p = PORTALS[portal]
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(portal, form.email, form.password)
      navigate(location.state?.from?.pathname || '/app', { replace: true })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      portal={portal}
      title="Log in"
      subtitle={p.loginSubtitle}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to={p.registerPath} className="font-medium text-white underline">
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {params.get('expired') && <Alert type="info">Your session expired. Please log in again.</Alert>}
        {params.get('registered') && <Alert type="success">Registration submitted. You can log in once an admin approves your account.</Alert>}
        <Alert>{error}</Alert>
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Log in
        </Button>
      </form>
    </AuthLayout>
  )
}
