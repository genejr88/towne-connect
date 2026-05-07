import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('connect_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('connect_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const { token, user } = await authApi.login(username, password)
    localStorage.setItem('connect_token', token)
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('connect_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
