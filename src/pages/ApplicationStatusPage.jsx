import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import Button from '../components/common/Button'
import Loader from '../components/common/Loader'
import useAuth from '../hooks/useAuth'
import { STAGES } from '../utils/stages'

const POLL_INTERVAL_MS = 30000

// Every step of the review, in order. `reached` says how far the application has got for each stage.
const STEPS = [
  { title: 'Application submitted', detail: 'We have received your details and documents.' },
  { title: 'Review', detail: 'Our team checks your company, tax and bank details.' },
  { title: 'Verification', detail: 'Your details are verified before your account is set up.' },
  { title: 'Vendor account ready', detail: 'Your account is created and invoices are unlocked.' },
]

// How many steps are complete for each stage; the next one is "in progress".
const COMPLETED_STEPS = {
  [STAGES.makerReview]: 1,
  [STAGES.checkerReview]: 2,
  [STAGES.approved]: 3,
}

const HEADLINES = {
  [STAGES.makerReview]: ['Your application is under review', 'Our team is reviewing your details. This usually takes about 3 working days.'],
  [STAGES.checkerReview]: ['Almost there: verification in progress', 'Your details have been reviewed and are now being verified. We’ll email you as soon as your account is ready.'],
  [STAGES.approved]: ['Approved: setting up your account', 'Your application is approved. We’re creating your vendor account, which can take a little while.'],
  [STAGES.rejected]: ['Your application was not approved', 'Please contact support to discuss next steps.'],
}

const formatDate = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

// What a vendor sees between submitting their application and being approved: progress only, nothing to do.
// Invoices and change requests stay locked until the vendor is active.
export default function ApplicationStatusPage() {
  const { profile, stage, refreshProfile, user, logout } = useAuth()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const rejected = stage === STAGES.rejected
  const completed = COMPLETED_STEPS[stage] ?? 0
  const [headline, subline] = HEADLINES[stage] || HEADLINES[STAGES.makerReview]
  const vendorName = profile?.vendor_legal_name || profile?.name || user?.email

  const refresh = async () => {
    setRefreshing(true)
    try { await refreshProfile() } catch { /* the next poll tries again */ } finally { setRefreshing(false) }
  }

  // Keep the status current without a reload; when the stage changes, the route moves the vendor to the right page.
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refreshProfile().catch(() => {}) }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refreshProfile])

  // The application was rejected for good: signing out and starting a new one is the only way forward.
  const startNewApplication = () => {
    const email = user?.email
    logout()
    navigate('/', { replace: true, state: { startNewApplication: true, email } })
  }
  const reasons = profile?.rejection?.items || []
  const overallRemark = profile?.rejection?.overall_remark

  const details = [
    ['Request ID', `VR-${profile?.vendor_id}`],
    ['Vendor', vendorName],
    ['Submitted', formatDate(profile?.submitted_at)],
    ['Status', rejected ? 'Not approved' : 'In review'],
  ]

  return (
    <AppShell breadcrumb="Application status">
      <PageContainer className="max-w-4xl">
        <section className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-[0_22px_60px_rgba(40,83,130,0.1)]">
          <div className={`px-6 py-7 sm:px-9 ${rejected ? 'bg-red-50' : 'bg-[#eef7ff]'}`}>
            <span className={`grid size-12 place-items-center rounded-full ${rejected ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
              {rejected ? <AlertCircle size={26} /> : <Clock3 size={26} />}
            </span>
            <p className="eyebrow mt-5">{rejected ? 'Application closed' : 'Application status'}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-navy-950 sm:text-3xl">{headline}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subline}</p>
            {(profile?.submission_round || 0) > 1 && !rejected && (
              <p className="mt-3 inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-brand-700">
                Resubmitted application
              </p>
            )}
          </div>

          <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-[1.2fr_1fr]">
            {!rejected && (
              <ol className="space-y-5" aria-label="Review progress">
                {STEPS.map((step, index) => {
                  const done = index < completed
                  const current = index === completed
                  return (
                    <li key={step.title} className="flex gap-3" aria-current={current ? 'step' : undefined}>
                      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : current ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'border border-slate-300 bg-white text-slate-500'}`}>
                        {done ? <Check size={15} /> : index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${done || current ? 'text-navy-900' : 'text-slate-500'}`}>
                          {step.title}{current && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">In progress</span>}
                        </p>
                        <p className="text-xs leading-5 text-slate-500">{step.detail}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}

            <div className={rejected ? 'md:col-span-2' : ''}>
              <dl className={`grid gap-3 sm:grid-cols-2 ${rejected ? 'lg:grid-cols-4' : 'md:grid-cols-1'}`}>
                {details.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-bold text-navy-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {rejected && (reasons.length > 0 || overallRemark) && (
                <section className="mt-4 overflow-hidden rounded-lg border border-red-200 bg-white" aria-label="Why the application was not approved">
                  <h2 className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-red-800">
                    Why it was not approved
                  </h2>
                  <ul className="divide-y divide-slate-100">
                    {reasons.map((item) => (
                      <li key={item.item_id} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                        <span className="text-xs font-bold text-navy-900">{item.field_label}</span>
                        <span className="text-xs leading-5 text-slate-700">{item.reason_label}{item.remark && <span className="text-slate-500"> ({item.remark})</span>}</span>
                      </li>
                    ))}
                    {overallRemark && (
                      <li className="grid gap-0.5 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                        <span className="text-xs font-bold text-navy-900">Note from our team</span>
                        <span className="whitespace-pre-line text-xs leading-5 text-slate-700">{overallRemark}</span>
                      </li>
                    )}
                  </ul>
                </section>
              )}
              <div className="mt-4 flex flex-col gap-4 rounded-lg border border-blue-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-700">
                  <CheckCircle2 size={14} className="mr-1.5 inline -translate-y-px text-brand-600" />
                  {rejected
                    ? 'This application is closed and cannot be reopened. You can apply again with a new application. Questions? Write to support@fourthsignal.com and mention your request ID.'
                    : 'Invoices and profile changes unlock once your account is approved. We’ll email you, and you can also come back to this page any time.'}
                </p>
                {rejected && <Button className="shrink-0" onClick={startNewApplication}>Start a new application</Button>}
                {!rejected && (
                  <Button variant="secondary" className="shrink-0" onClick={refresh} disabled={refreshing}>
                    {refreshing ? <Loader /> : <RefreshCw size={16} />} Refresh status
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </PageContainer>
    </AppShell>
  )
}
