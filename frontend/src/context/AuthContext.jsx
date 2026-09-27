import { createContext, useContext, useState } from 'react'
import api from '../api/client'
import { PORTALS } from '../portals'

const AuthContext = createContext(null)

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)

  const saveSession = ({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }

  // portal: 'owner' | 'police' | 'admin'
  const login = async (portal, email, password) =>
    saveSession((await api.post(PORTALS[portal].api.login, { email, password })).data)

  // Naval Police registration returns no token (needs approval), so no session is saved
  const register = async (portal, body) => {
    const { data } = await api.post(PORTALS[portal].api.register, body)
    if (data.token) saveSession(data)
    return data
  }

  const logout = () => {
    // remember which portal to return to after logout
    if (user?.role) localStorage.setItem('lastPortal', user.role)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
