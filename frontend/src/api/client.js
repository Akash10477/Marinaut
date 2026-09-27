import axios from 'axios'

// Vite proxy /api -> http://localhost:5000
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

// attach the token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// log out automatically when the token expires
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      let role = 'owner'
      try {
        role = JSON.parse(localStorage.getItem('user'))?.role || 'owner'
      } catch {
        /* ignore */
      }
      localStorage.setItem('lastPortal', role)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const loginPath = { admin: '/admin/login', police: '/police/login' }[role] || '/login'
      window.location.href = `${loginPath}?expired=1`
    }
    return Promise.reject(err)
  }
)

// extract the backend error message
export const errMsg = (err) => {
  const data = err?.response?.data
  if (data?.errors?.length) return data.errors.join(', ')
  return data?.message || err?.message || 'Something went wrong'
}

export default api
