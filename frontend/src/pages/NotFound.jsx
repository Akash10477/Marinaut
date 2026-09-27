import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-bold text-navy-200">404</p>
      <p className="text-slate-600">This page does not exist.</p>
      <Link to="/" className="text-sm font-medium text-navy-600 hover:underline">
        Go home
      </Link>
    </div>
  )
}
