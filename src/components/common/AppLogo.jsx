import { Link } from 'react-router-dom'

export default function AppLogo({ light = false, compact = false, to = '/' }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none"
      aria-label="Vendor Onboarding home"
    >
      <svg className={compact ? 'size-8' : 'size-10'} viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="10" fill={light ? '#ffffff' : '#f4f8fc'} />
        <rect x="13" y="8" width="23" height="7" rx="3.5" fill="#c0252d" />
        <rect x="13" y="17" width="17" height="7" rx="3.5" fill="#e3a71d" />
        <rect x="13" y="26" width="19" height="7" rx="3.5" fill="#23855d" />
        <circle cx="17" cy="39" r="4" fill="#626970" />
      </svg>
      <span>
        <span className={`block font-extrabold leading-none tracking-[-0.02em] ${compact ? 'text-sm' : 'text-lg'} ${light ? 'text-white' : 'text-navy-950'}`}>
          Vendor Central
        </span>
        {!compact && (
          <span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] ${light ? 'text-blue-100' : 'text-slate-500'}`}>
            Supplier onboarding
          </span>
        )}
      </span>
    </Link>
  )
}
