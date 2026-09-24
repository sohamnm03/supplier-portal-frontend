import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Home, LogOut } from 'lucide-react'
import AppLogo from '../common/AppLogo'
import useAuth from '../../hooks/useAuth'
import VendorProfilePanel from './VendorProfilePanel'
import { getVendorProfile } from '../../api/vendorApi'

export default function AppShell({ breadcrumb, children, backTo }) {
  const { logout, user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const homePath = user?.role === 'guest' ? '/request-vendor' : '/invoices'

  useEffect(() => {
    if (user?.role !== 'user' || !user.vendor_id || profile) return undefined
    let ignore = false
    getVendorProfile(user.vendor_id)
      .then((details) => { if (!ignore) updateProfile(details) })
      .catch(() => {})
    return () => { ignore = true }
  }, [profile, updateProfile, user])

  const handleSignOut = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell relative flex min-h-screen flex-col overflow-hidden bg-[#f4f8fc]">
      <div
        className="pointer-events-none absolute -right-32 top-20 size-[30rem] rounded-full border-[70px] border-blue-100/45"
        aria-hidden="true"
      />

      {!backTo && <header className="no-print relative z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-3 sm:px-4 lg:px-5">
          <div className="flex min-w-0 items-center gap-5">
            <AppLogo compact />
            <div className="hidden h-7 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
              <Link to={homePath} className="transition hover:text-brand-600">Workspace</Link>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="truncate font-semibold text-navy-900">{breadcrumb || 'Vendor Onboarding'}</span>
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              to={homePath}
              aria-label="Workspace home"
              title="Workspace home"
              className="interactive-icon"
            >
              <Home size={18} />
            </Link>
            <button
              type="button"
              onClick={() => user?.role === 'user' && setProfileOpen(true)}
              disabled={user?.role !== 'user'}
              className="hidden items-center gap-2 border-l border-slate-200 pl-3 text-left transition hover:text-brand-700 disabled:cursor-default sm:flex"
              aria-label="Open vendor profile"
            >
              <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {(user?.email?.[0] || 'V').toUpperCase()}
              </span>
              <span className="max-w-36 truncate text-xs font-semibold text-slate-600">
                {user?.email === 'guest' ? 'New vendor' : user?.email}
              </span>
            </button>
            <button onClick={handleSignOut} aria-label="Sign out" title="Sign out" className="interactive-icon">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>}

      <main className={`app-shell__main relative z-10 flex-1 py-2 sm:py-3 ${backTo ? 'guest-shell__main flex min-h-0 flex-col pt-3 sm:pt-4' : ''}`}>
        {backTo && (
          <div className="no-print mx-auto mb-2 w-full shrink-0 px-3 sm:px-4">
            <Link
              to={backTo}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-navy-900"
            >
              <ArrowLeft size={18} /> Back
            </Link>
          </div>
        )}
        {children}
      </main>
      <VendorProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} profile={profile} onSaved={updateProfile} />
    </div>
  )
}
