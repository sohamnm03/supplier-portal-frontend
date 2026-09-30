import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Check, ChevronRight, ClipboardList, Clock, FilePenLine, Inbox, LoaderCircle, ShieldCheck, UserCheck, X, XCircle } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import useAuth from '../hooks/useAuth'
import { getUpdateRequests } from '../api/vendorApi'

const FIELD_LABELS = {
  vendor_legal_name: 'Vendor legal name', contact_no: 'Phone number', vendor_type: 'Vendor type', year_established: 'Year established',
  currency: 'Transaction currency', registration_number: 'Company registration number', msme_status: 'MSME status', udyam_number: 'MSME / Udyam number',
  gstin: 'GSTIN', pan: 'PAN', aadhaar_no: 'Aadhaar number', cin: 'CIN',
  street: 'Address line 1', city: 'City', district: 'District / County', region: 'State', postal_code: 'Postal / PIN code',
  account_holder_name: 'Account holder name', bank_name: 'Bank name', branch_name: 'Branch name', bank_account_no: 'Account number', ifsc_code: 'IFSC code',
}

const STATUS_STYLES = {
  'update requested': { label: 'Update Requested', tone: 'bg-amber-50 text-amber-700' },
  'sent for approval': { label: 'Sent for Approval', tone: 'bg-blue-50 text-blue-700' },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-700' },
}

const STEPS = ['Update Requested', 'Sent for Approval', 'Approved']

const IN_REVIEW = ['update requested', 'sent for approval']

const STATUS_MESSAGES = {
  'update requested': 'Your request has been sent. Our team will review it shortly.',
  'sent for approval': 'Reviewed by the maker and now waiting for the checker’s final approval.',
  approved: 'Approved — your vendor details have been updated.',
  rejected: 'This request was rejected. Your existing details are unchanged.',
}

const FILTERS = [
  ['all', 'All'],
  ['review', 'In review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]

const HOW_IT_WORKS = [
  { icon: FilePenLine, title: 'You send a request', text: 'Edit your details from your profile and click Send request.' },
  { icon: UserCheck, title: 'Maker reviews it', text: 'Our team checks the changes and sends them on for approval.' },
  { icon: ShieldCheck, title: 'Checker approves', text: 'Once approved, your vendor details are updated everywhere.' },
]

const parseDate = (value) => {
  const date = new Date(String(value || '').replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const date = parseDate(value)
  return date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : String(value || '')
}

const timeAgo = (value) => {
  const date = parseDate(value)
  if (!date) return ''
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const stepIndex = (status) => ({ 'update requested': 0, 'sent for approval': 1, approved: 2 })[status] ?? 0

const fieldNames = (request) => request.changed_fields.map((field) => FIELD_LABELS[field] || field)

export default function UpdateRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user?.vendor_id) return undefined
    let ignore = false
    setLoading(true)
    getUpdateRequests(user.vendor_id)
      .then((rows) => { if (!ignore) { setRequests(rows); setError('') } })
      .catch((requestError) => { if (!ignore) setError(requestError?.message || 'Unable to load update requests.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [user?.vendor_id])

  const counts = useMemo(() => ({
    total: requests.length,
    review: requests.filter((item) => IN_REVIEW.includes(item.status)).length,
    approved: requests.filter((item) => item.status === 'approved').length,
    rejected: requests.filter((item) => item.status === 'rejected').length,
  }), [requests])

  const openRequest = requests.find((item) => IN_REVIEW.includes(item.status))
  const visible = requests.filter((item) => filter === 'all' || (filter === 'review' ? IN_REVIEW.includes(item.status) : item.status === filter))

  return (
    <AppShell breadcrumb="Update Requests">
      <PageContainer wide className="vendor-workspace h-full">
        <div className="mx-auto flex h-full max-w-[1820px] min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-4 sm:px-2">
          <div className="px-1">
            <h1 className="text-lg font-extrabold text-[#0b2b52]">Update Requests</h1>
            <p className="mt-1 text-xs text-[#59728f]">Track the changes you asked to make to your vendor details. Your current details stay active until a request is approved.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={ClipboardList} tone="text-[#1769e8] bg-[#eef5fd]" label="Total requests" value={counts.total} />
            <StatTile icon={Clock} tone="text-amber-600 bg-amber-50" label="In review" value={counts.review} />
            <StatTile icon={CheckCircle2} tone="text-emerald-600 bg-emerald-50" label="Approved" value={counts.approved} />
            <StatTile icon={XCircle} tone="text-red-500 bg-red-50" label="Rejected" value={counts.rejected} />
          </div>

          {openRequest && (
            <section className="rounded-xl border border-[#bcd6fb] bg-[#f5f9ff] p-4 shadow-[0_4px_16px_rgba(40,83,130,0.04)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#1769e8]">Current request</p>
                  <h2 className="mt-1 text-sm font-extrabold text-[#0b2b52]">Request #{openRequest.request_id} · sent {timeAgo(openRequest.requested_at)}</h2>
                  <p className="mt-1 text-xs text-[#59728f]">{STATUS_MESSAGES[openRequest.status]}</p>
                </div>
                <button type="button" onClick={() => setSelected(openRequest)} className="rounded-md border border-[#bfd2e8] bg-white px-3 py-1.5 text-xs text-[#1769e8] transition hover:bg-blue-50"><span className="font-semibold">View details</span></button>
              </div>
              <div className="mt-4"><ProgressSteps status={openRequest.status} /></div>
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[#59728f]">Changing:</span>
                {fieldNames(openRequest).map((name) => <span key={name} className="rounded-full border border-[#d5e1ed] bg-white px-2.5 py-0.5 font-medium text-[#29466a]">{name}</span>)}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-[#dce6f1] bg-white shadow-[0_4px_16px_rgba(40,83,130,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-extrabold text-[#0b2b52]">Request history</h2>
                <span className="grid min-w-5 place-items-center rounded-full bg-[#eef5fd] px-1.5 py-0.5 text-[11px] font-bold text-[#1769e8]">{visible.length}</span>
              </div>
              <div className="flex gap-1.5 text-xs" role="tablist" aria-label="Filter requests">
                {FILTERS.map(([value, label]) => (
                  <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1 transition ${filter === value ? 'border-[#1769e8] bg-[#1769e8] text-white' : 'border-[#d5e1ed] bg-white text-[#52708f] hover:border-[#1769e8] hover:text-[#1769e8]'}`}>
                    <span className={filter === value ? 'font-bold' : 'font-medium'}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 border-t border-[#dfe7f0] px-6 py-14 text-sm font-semibold text-slate-600"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading requests...</div>
            ) : error ? (
              <div role="alert" className="m-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800"><AlertCircle size={18} /> {error}</div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 border-t border-[#dfe7f0] px-6 py-12 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-[#7e9cbb]"><Inbox size={20} /></span>
                <p className="text-sm font-bold text-[#102a4c]">{requests.length ? 'No requests in this view' : 'No update requests yet'}</p>
                <p className="max-w-md text-xs text-slate-500">{requests.length ? 'Try another filter to see your other requests.' : 'When you edit your details from your profile and send a request, it will show up here so you can follow its progress.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse border-t border-[#dfe7f0] text-left">
                  <thead className="bg-[#f8fbff] text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#617995]">
                    <tr>
                      <th className="px-5 py-3">Request</th>
                      <th className="px-4 py-3">Requested on</th>
                      <th className="px-4 py-3">Changes</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {visible.map((item) => {
                      const status = STATUS_STYLES[item.status] || { label: item.status, tone: 'bg-slate-100 text-slate-600' }
                      return (
                        <tr key={item.request_id} className="cursor-pointer transition hover:bg-blue-50/35" onClick={() => setSelected(item)}>
                          <td className="px-5 py-3 text-xs font-extrabold text-[#102a4c]">#{item.request_id}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-[#102a4c]">{formatDate(item.requested_at)}</td>
                          <td className="max-w-md truncate px-4 py-3 text-xs text-[#102a4c]">{fieldNames(item).join(', ')}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>•&nbsp; {status.label}</span></td>
                          <td className="px-5 py-3 text-right text-[#1769e8]"><ChevronRight size={16} className="ml-auto" /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#dce6f1] bg-white p-4 shadow-[0_4px_16px_rgba(40,83,130,0.04)] sm:p-5">
            <h2 className="text-[13px] font-extrabold text-[#0b2b52]">How updating your details works</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="flex items-start gap-3 rounded-lg border border-[#e3ebf4] bg-[#fbfcfe] p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef5fd] text-[#1769e8]"><Icon size={17} /></span>
                  <div>
                    <p className="text-xs font-bold text-[#102a4c]">{index + 1}. {title}</p>
                    <p className="mt-0.5 text-xs text-[#59728f]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#59728f]">You can have one request in review at a time. If a request is rejected, you’ll see the reason here and can send a new one.</p>
          </section>
        </div>
      </PageContainer>
      <RequestDetail request={selected} onClose={() => setSelected(null)} />
    </AppShell>
  )
}

function StatTile({ icon: Icon, tone, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#dce6f1] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(40,83,130,0.04)]">
      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={18} /></span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#607a98]">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-[#0b2b52]">{value}</p>
      </div>
    </div>
  )
}

function ProgressSteps({ status }) {
  const rejected = status === 'rejected'
  const current = stepIndex(status)
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((step, index) => {
        const failed = rejected && index === 2
        const done = !rejected && index <= current
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${failed ? 'bg-red-500 text-white' : done ? 'bg-[#1769e8] text-white' : 'border border-[#d5e1ed] bg-white text-[#7189a4]'}`}>
              {failed ? <X size={13} /> : done ? <Check size={13} /> : index + 1}
            </span>
            <span className={`font-semibold ${failed ? 'text-red-600' : done ? 'text-[#102a4c]' : 'text-[#7189a4]'}`}>{failed ? 'Rejected' : step}</span>
            {index < STEPS.length - 1 && <span className={`h-px flex-1 ${done && index < current ? 'bg-[#1769e8]' : 'bg-[#dce6f1]'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

function RequestDetail({ request, onClose }) {
  useEffect(() => {
    if (!request) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [request, onClose])

  if (!request) return null
  const rejected = request.status === 'rejected'

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-2 sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Update request details">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#6aafff] bg-[#eef6ff] px-5 py-3.5">
          <div>
            <h2 className="text-[17px] font-bold text-[#102a4c]">Update request #{request.request_id}</h2>
            <p className="mt-1 text-xs text-[#59728f]">Requested on {formatDate(request.requested_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/80 text-[#5f7895] transition hover:bg-white hover:text-[#102a4c]"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 text-[13px]">
          <div className="mb-5"><ProgressSteps status={request.status} /></div>
          <p className="mb-4 text-xs text-[#59728f]">{STATUS_MESSAGES[request.status]}</p>

          {rejected && request.rejection_reason && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"><AlertCircle size={15} className="mt-0.5 shrink-0" /><p><span className="font-bold">Reason:</span> {request.rejection_reason}</p></div>
          )}

          <div className="overflow-x-auto rounded-lg border border-[#cfdae7]">
            <table className="w-full min-w-[480px] table-fixed border-collapse">
              <thead>
                <tr className="bg-[#f8fbff]">
                  {['Field', 'Current', 'Requested'].map((header) => <th key={header} className="border-b border-[#cfdae7] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.03em] text-[#607a98]">{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {request.changed_fields.map((field) => (
                  <tr key={field}>
                    <td className="border-b border-[#edf2f7] px-3 py-2 font-semibold text-[#102a4c]">{FIELD_LABELS[field] || field}</td>
                    <td className="break-words border-b border-[#edf2f7] px-3 py-2 text-[#59728f]">{request.old_values?.[field] ?? ''}</td>
                    <td className="break-words border-b border-[#edf2f7] px-3 py-2 font-semibold text-[#102a4c]">{request.new_values?.[field] ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
