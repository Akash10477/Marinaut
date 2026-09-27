import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, Button, Modal } from './ui'

// "Type to confirm" dialog before permanently deleting a vessel / owner that has records
// info = the backend's 400 response: { message, linked: { vessels, fines, payments }, confirmWith }
export default function ForceDeleteModal({ info, title, onConfirm, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  if (!info) return null

  const matches = text.trim().toLowerCase() === String(info.confirmWith).toLowerCase()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onConfirm(text.trim())
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      setLoading(false)
    }
  }

  const items = [
    info.linked.vessels > 0 && `${info.linked.vessels} vessel(s)`,
    `${info.linked.fines} fine record(s)`,
    `${info.linked.payments} payment record(s) and receipt(s)`,
  ].filter(Boolean)

  return (
    <Modal open title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle size={20} className="shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">This permanently deletes:</p>
            <ul className="mt-1 list-inside list-disc">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <p className="mt-2">Collection totals and reports will no longer include these records. This cannot be undone.</p>
          </div>
        </div>
        <Alert>{error}</Alert>
        <label className="block text-sm">
          <span className="text-slate-700">
            Type <b className="font-mono">{info.confirmWith}</b> to confirm
          </span>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Keep
          </Button>
          <Button type="submit" variant="danger" disabled={!matches} loading={loading}>
            Delete permanently
          </Button>
        </div>
      </form>
    </Modal>
  )
}
