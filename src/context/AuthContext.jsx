import { useMemo, useState } from 'react'
import { AuthContext } from './auth-context'

const AUTH_KEY = 'vendor-onboarding-auth'

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [profile, setProfile] = useState(null)

  const value = useMemo(() => ({
    user,
    profile,
    isAuthenticated: Boolean(user),
    login: (email, role = 'user', vendorId = null, vendorProfile = null) => {
      const nextUser = { email, role, vendor_id: vendorId }
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
      setProfile(vendorProfile)
    },
    updateProfile: (nextProfile) => {
      setProfile(nextProfile)
      if (nextProfile?.email) {
        setUser((current) => {
          const nextUser = { ...current, email: nextProfile.email }
          localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
          return nextUser
        })
      }
    },
    logout: () => {
      localStorage.removeItem(AUTH_KEY)
      setUser(null)
      setProfile(null)
    },
  }), [profile, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
