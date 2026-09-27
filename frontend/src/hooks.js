import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from './api/client'

// GET request with loading/error state. Call reload() to fetch again.
export function useFetch(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(url)
      setData(res.data)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}
