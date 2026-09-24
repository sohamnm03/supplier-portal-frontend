import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Home, Printer } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'

const reviewSteps = ['Request received', 'Procurement review', 'Tax and banking verification']

export default function SubmissionSuccessPage() {
  const { state } = useLocation()
  if (!state?.requestId) return <Navigate to="/request-vendor" replace />

  const details = [
    ['Vendor name', state.vendorName],
    ['Submission date', state.submissionDate, CalendarDays],
    ['Current status', 'Pending review', Clock3],
    ['Expected next step', 'Procurement verification'],
  ]

  return (
    <AppShell backTo="/">
      <PageContainer className="max-w-5xl">
        <section className="print-card grid overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-[0_22px_60px_rgba(40,83,130,0.1)] lg:grid-cols-[38%_62%]">
          <div className="flex flex-col bg-[#eef7ff] p-7 sm:p-10">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={29} />
            </span>
            <p className="eyebrow mt-8">Submission confirmed</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.035em] text-navy-950">
              Your request is on its way
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Your vendor profile has been received and is ready for internal review.
            </p>

            <div className="mt-8 space-y-4">
              {reviewSteps.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-500'}`}>
                    {index === 0 ? <Check size={15} /> : index + 1}
                  </span>
                  <span className={`text-xs font-semibold ${index === 0 ? 'text-navy-900' : 'text-slate-500'}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Request ID</p>
            <p className="mt-2 break-all text-3xl font-extrabold tracking-[-0.02em] text-navy-950">{state.requestId}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Keep this reference number for your records and future support enquiries.</p>

            <dl className="mt-7 grid gap-3 sm:grid-cols-2">
              {details.map(([label, value, Icon]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    {Icon && <Icon size={14} />} {label}
                  </dt>
                  <dd className="mt-2 text-sm font-bold text-navy-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-lg border border-blue-200 bg-brand-50 p-4 text-sm leading-6 text-slate-700">
              <strong className="text-brand-700">What happens next?</strong> Procurement will review the vendor profile, followed by tax and banking verification. You’ll be contacted if more information is needed.
            </div>

            <div className="no-print mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-sm font-bold text-navy-900 transition hover:bg-slate-50"
              >
                <Printer size={17} /> Print acknowledgement
              </button>
              <Link
                to="/request-vendor"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,105,232,0.18)] transition hover:bg-brand-700"
              >
                <Home size={17} /> New vendor request <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </PageContainer>
    </AppShell>
  )
}
