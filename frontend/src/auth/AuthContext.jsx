import { createContext, useContext, useState, useEffect } from 'react'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem(ACCESS_TOKEN))

  const login = (access, refresh) => {
    localStorage.setItem(ACCESS_TOKEN, access)
    localStorage.setItem(REFRESH_TOKEN, refresh)
    setIsLoggedIn(true)
  }

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN)
    localStorage.removeItem(REFRESH_TOKEN)
    setIsLoggedIn(false)
  }

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem(ACCESS_TOKEN))
  }, [])

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}