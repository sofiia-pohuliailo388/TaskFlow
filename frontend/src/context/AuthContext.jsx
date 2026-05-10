import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { apiLogin, apiRegister, apiGoogleAuth } from '../api/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Listen for forced logouts triggered by the axios interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null)
      localStorage.removeItem('user')
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = useCallback(async (email, password) => {
    const tokens = await apiLogin(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const userData = { email: tokens.email, name: tokens.name }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return tokens
  }, [])

  const register = useCallback(async (name, email, password) => {
    const newUser = await apiRegister(name, email, password)
    // Auto-login after register
    const tokens = await apiLogin(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const userData = { email: newUser.email, name: newUser.name }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return newUser
  }, [])

  const loginWithGoogle = useCallback(async (idToken) => {
    const tokens = await apiGoogleAuth(idToken)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const userData = { email: tokens.email, name: tokens.name }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return tokens
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, loginWithGoogle, register, logout, isAuthenticated: !!user }),
    [user, login, loginWithGoogle, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
