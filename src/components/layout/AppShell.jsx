import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Home, LogOut } from 'lucide-react'
import AppLogo from '../common/AppLogo'
import useAuth from '../../hooks/useAuth'

export default function AppShell({ breadcrumb, children }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const homePath = user?.role === 'guest' ? '/request-vendor' : '/invoices'

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

      <header className="no-print relative z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
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
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {(user?.email?.[0] || 'V').toUpperCase()}
              </span>
              <span className="max-w-36 truncate text-xs font-semibold text-slate-600">
                {user?.email === 'guest' ? 'New vendor' : user?.email}
              </span>
            </div>
            <button onClick={handleSignOut} aria-label="Sign out" title="Sign out" className="interactive-icon">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="app-shell__main relative z-10 flex-1 py-2 sm:py-3">{children}</main>
    </div>
  )
}
