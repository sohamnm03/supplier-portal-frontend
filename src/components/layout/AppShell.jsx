import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, FilePenLine, FileText, Home, LogOut } from 'lucide-react'
import AppLogo from '../common/AppLogo'
import useAuth from '../../hooks/useAuth'
import VendorProfilePanel from './VendorProfilePanel'
import { getVendorProfile } from '../../api/vendorApi'

const NAV_ITEMS = [
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/update-requests', label: 'Change Requests', icon: FilePenLine },
]

export default function AppShell({ breadcrumb, children, backTo, onBack }) {
  const { logout, user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const showSidebar = user?.role === 'user' && !backTo
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

      <div className="relative z-10 flex min-h-0 flex-1">
        {showSidebar && (
          <aside className="group no-print hidden w-14 shrink-0 overflow-hidden border-r border-slate-200 bg-white px-2 py-4 transition-[width] duration-200 ease-out hover:w-56 focus-within:w-56 md:block" aria-label="Sections">
            {/* Icon rail that widens (and moves the page over) while hovered or focused. */}
            <div className="w-52">
              <p className="h-4 whitespace-nowrap px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">Workspace</p>
              <nav className="mt-2 flex flex-col gap-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to
                  return (
                    <Link key={to} to={to} title={label} aria-label={label} aria-current={active ? 'page' : undefined} className={`flex w-10 items-center gap-3 overflow-hidden rounded-lg px-[11px] py-2.5 text-[13px] transition-[width,background-color,color] group-hover:w-full group-focus-within:w-full ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'}`}>
                      <Icon size={18} className="shrink-0" />
                      <span className={`whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showSidebar && (
            <nav className="no-print flex gap-1 overflow-x-auto border-b border-slate-200 bg-white/90 px-3 py-2 md:hidden" aria-label="Sections">
              {NAV_ITEMS.map(({ to, label }) => (
                <Link key={to} to={to} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ${location.pathname === to ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`}>{label}</Link>
              ))}
            </nav>
          )}
      <main className={`app-shell__main relative flex-1 min-w-0 py-2 sm:py-3 ${backTo ? 'guest-shell__main flex min-h-0 flex-col pt-3 sm:pt-4' : ''}`}>
        {backTo && (
          <div className="no-print mx-auto mb-2 w-full shrink-0 px-3 sm:px-4">
            {onBack ? (
              // The page needs to confirm first (e.g. unsaved progress would be lost), so it decides when to leave.
              <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-navy-900"
              >
                <ArrowLeft size={18} /> Back
              </button>
            ) : (
              <Link
                to={backTo}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-navy-900"
              >
                <ArrowLeft size={18} /> Back
              </Link>
            )}
          </div>
        )}
        {children}
      </main>
        </div>
      </div>
      <VendorProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} profile={profile} onProfileRefresh={updateProfile} />
    </div>
  )
}
