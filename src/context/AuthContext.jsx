import { useMemo, useState } from 'react'
import { AuthContext } from './auth-context'

const AUTH_KEY = 'vendor-onboarding-auth'

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login: (email, role = 'user', vendorId = null) => {
      const nextUser = { email, role, vendor_id: vendorId }
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
    },
    logout: () => {
      localStorage.removeItem(AUTH_KEY)
      setUser(null)
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
