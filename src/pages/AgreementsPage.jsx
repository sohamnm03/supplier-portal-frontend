import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarCheck, CalendarPlus, CalendarClock, CalendarRange, Download, Eye, FilePenLine, FileSignature, LifeBuoy, Mail, PenLine, RefreshCw, Send } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import Button from '../components/common/Button'
import Loader from '../components/common/Loader'
import AgreementViewDialog from '../components/agreement/AgreementViewDialog'
import { SMALL_BUTTON, STATE_BADGES, daysLeft, formatDate, formatPeriod, keyTermTiles } from '../components/agreement/agreementUtils'
import { downloadAgreement, getMyAgreements } from '../api/vendorApi'
import useAuth from '../hooks/useAuth'
import { STAGES } from '../utils/stages'

const EXPIRY_WARNING_DAYS = 60
const SUPPORT_EMAIL = 'support@fourthsignal.com'
const card = 'overflow-hidden rounded-lg border border-[#dce6f1] bg-white'
const cardHeading = 'border-b border-[#dce6f1] bg-[#eef7ff] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#29466a]'

function StateBadge({ state }) {
  const [text, style] = STATE_BADGES[state] || [state || '—', STATE_BADGES.replaced[1]]
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style}`}>{text}</span>
}

// Share of the term (start to end) that has passed, 0 to 100.
function termProgress(agreement) {
  const start = agreement?.start_iso ? new Date(agreement.start_iso).getTime() : NaN
  const end = agreement?.end_iso ? new Date(agreement.end_iso).getTime() : NaN
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100))
}

const renewalDue = (agreement) => {
  const end = agreement?.end_iso ? new Date(agreement.end_iso) : null
  if (!end || Number.isNaN(end.getTime())) return null
  end.setDate(end.getDate() - EXPIRY_WARNING_DAYS)
  return end
}

// All of the vendor's agreements: the one in force, a renewal waiting for a signature, and the history.
export default function AgreementsPage() {
  const { stage } = useAuth()
  const navigate = useNavigate()
  const [agreements, setAgreements] = useState(null)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const isActive = stage === STAGES.active

  const load = useCallback(async () => {
    setError('')
    try { setAgreements(await getMyAgreements()) } catch (err) { setError(err.message); setAgreements((value) => value || []) }
  }, [])
  useEffect(() => { load() }, [load])

  const download = async (item) => {
    setBusyId(item.agreement_id)
    try { await downloadAgreement(item.agreement_id, item.agreement_no) } catch (err) { setError(err.message) } finally { setBusyId(null) }
  }

  const list = agreements || []
  const current = list.find((item) => item.is_current) || list.find((item) => item.status === 'signed' && item.derived_state === 'active') || null
  const renewal = list.find((item) => item.can_sign && item.status === 'sent' && item.agreement_id !== current?.agreement_id) || null
  // A signed renewal that starts later: the earliest one is "next". With nothing in force yet it becomes the main card.
  const scheduled = list.filter((item) => item.derived_state === 'scheduled').sort((a, b) => String(a.start_iso).localeCompare(String(b.start_iso)))
  const next = scheduled[0] || null
  const hero = current || next
  const heroScheduled = !current && Boolean(next)
  const showNext = Boolean(current && next)
  const history = list.filter((item) => item.agreement_id !== hero?.agreement_id)
  const remaining = hero && !heroScheduled ? daysLeft(hero) : null
  const expired = hero && !heroScheduled ? hero.derived_state === 'expired' || (remaining !== null && remaining < 0) : false
  const expiring = !expired && remaining !== null && remaining < EXPIRY_WARNING_DAYS
  const accent = heroScheduled ? 'bg-[#3d5a80]' : expired ? 'bg-red-500' : expiring ? 'bg-amber-500' : 'bg-emerald-500'
  const activeCount = list.filter((item) => item.derived_state === 'active').length
  const scheduledCount = scheduled.length
  const awaitingCount = list.filter((item) => item.derived_state === 'awaiting').length
  const progress = hero && !heroScheduled ? termProgress(hero) : 0
  const due = hero ? renewalDue(hero) : null

  const actions = (item, compact) => (
    <div className="flex justify-end gap-1.5">
      <Button variant="secondary" className={SMALL_BUTTON} onClick={() => setViewing(item)}><Eye size={15} /> View</Button>
      <Button variant="secondary" className={SMALL_BUTTON} onClick={() => download(item)} disabled={busyId === item.agreement_id}>
        {busyId === item.agreement_id ? <Loader /> : <Download size={15} />} {compact ? '' : 'Download'}
      </Button>
    </div>
  )

  const keyDates = hero ? [
    [Send, 'Issued', formatDate(hero.issued_at)],
    [PenLine, 'Signed', formatDate(hero.signed_at)],
    [CalendarRange, 'Valid from', formatDate(hero.start_iso)],
    [CalendarCheck, 'Valid until', formatDate(hero.end_iso)],
    ...(showNext ? [[CalendarPlus, 'Next agreement starts', formatDate(next.start_iso)]] : []),
    ...(!heroScheduled ? [showNext ? [CalendarClock, 'Renewal signed', formatDate(next.signed_at)] : [CalendarClock, 'Renewal due', due ? formatDate(due) : '—']] : []),
  ] : []

  return (
    <AppShell breadcrumb="Agreement">
      <PageContainer wide className="vendor-workspace h-full">
        <div className="mx-auto flex h-full max-w-[1180px] min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-4 sm:px-2">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-1">
            <div>
              {!isActive && (
                <Link to="/application-status" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-navy-900"><ArrowLeft size={15} /> Back to application status</Link>
              )}
              <h1 className="text-lg font-extrabold text-[#0b2b52]">Agreement</h1>
              <p className="mt-1 text-xs text-[#59728f]">Your signed vendor agreement, its dates and every earlier version.</p>
            </div>
            {agreements !== null && list.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce6f1] bg-white px-3 py-1 text-xs font-bold text-[#29466a]" aria-label="Agreement summary">
                <i className={`size-2 rounded-full ${activeCount ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {activeCount} active{scheduledCount > 0 ? ` · ${scheduledCount} scheduled` : ''} · {awaitingCount} awaiting
              </span>
            )}
          </div>

          {error && (
            <p role="alert" className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
              {error}
              <Button variant="secondary" className={SMALL_BUTTON} onClick={load}><RefreshCw size={15} /> Retry</Button>
            </p>
          )}

          {renewal && (
            <section className="shrink-0 overflow-hidden rounded-lg border border-blue-300 bg-gradient-to-r from-[#eef7ff] to-white shadow-[0_6px_18px_rgba(40,83,130,0.08)]" aria-label="Renewed agreement ready for your signature">
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><FilePenLine size={18} /></span>
                  <div>
                    <h2 className="text-sm font-extrabold text-navy-900">Renewed agreement ready for your signature</h2>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600">{renewal.agreement_no} · Version {renewal.version} · {formatPeriod(renewal)}</p>
                  </div>
                </div>
                <Button className={`${SMALL_BUTTON} shrink-0`} onClick={() => navigate(`/agreements/${renewal.agreement_id}/sign`)}>Review and sign</Button>
              </div>
            </section>
          )}

          {agreements === null ? (
            <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-600"><Loader /> Loading your agreements…</div>
          ) : list.length === 0 && !error ? (
            <section className={`${card} px-6 py-14 text-center`}>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"><FileSignature size={24} /></span>
              <p className="mt-3 text-sm font-bold text-navy-900">No agreement on file yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Once an agreement is issued and signed, it appears here with its dates and every version.</p>
            </section>
          ) : (
            <>
              {hero && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-4 lg:col-span-2">
                  <section className={card} aria-label="Current agreement">
                    <div className={`h-1.5 ${accent}`} aria-hidden="true" />
                    <div className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#29466a]">{heroScheduled ? 'Next agreement' : 'Current agreement'}</p>
                          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-navy-950">{hero.agreement_no}</h2>
                          <p className="text-xs font-semibold text-slate-500">Version {hero.version}</p>
                        </div>
                        <StateBadge state={expired ? 'expired' : hero.derived_state || 'active'} />
                      </div>

                      <div className="mt-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <span className="font-bold text-navy-900">{formatPeriod(hero)}</span>
                          {heroScheduled && <span className="inline-flex items-center gap-1 font-bold text-[#3d5a80]">Starts {formatDate(hero.start_iso)}</span>}
                          {remaining !== null && (
                            <span className={`inline-flex items-center gap-1 font-bold ${expired ? 'text-red-700' : expiring ? 'text-amber-800' : 'text-emerald-700'}`}>
                              {(expired || expiring) && <AlertTriangle size={13} />}
                              {remaining < 0 ? 'Ended' : remaining === 1 ? '1 day left' : `${remaining} days left`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="How much of the term has passed">
                          <div className={`h-full rounded-full ${accent}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {keyTermTiles(hero).map(([name, value]) => (
                          <div key={name} className="rounded-lg border border-[#dce6f1] bg-[#f7fafd] px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">{name}</p>
                            <p className="text-sm font-bold text-navy-900">{value}</p>
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-xs text-slate-600">Signed by <b className="font-bold text-navy-900">{hero.signer_name || '—'}</b> on <b className="font-bold text-navy-900">{formatDate(hero.signed_at)}</b></p>
                      {(expiring || expired) && !showNext && (
                        <p className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${expired ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                          {expired ? 'This agreement has ended. Our team will send a renewed agreement for your signature.' : 'This agreement ends soon. Our team will send a renewed agreement for your signature.'}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
                      <Button className={SMALL_BUTTON} onClick={() => setViewing(hero)}><Eye size={15} /> View</Button>
                      <Button variant="secondary" className={SMALL_BUTTON} onClick={() => download(hero)} disabled={busyId === hero.agreement_id}>
                        {busyId === hero.agreement_id ? <Loader /> : <Download size={15} />} Download
                      </Button>
                    </div>
                  </section>

                  {showNext && (
                    <section className={`${card} border-[#c5d3e4]`} aria-label="Next agreement">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8eef6] text-[#3d5a80]"><CalendarPlus size={17} /></span>
                          <div>
                            <p className="text-[13px] font-extrabold text-navy-900">Next agreement: {next.agreement_no}</p>
                            <p className="text-xs leading-5 text-slate-600">Starts {formatDate(next.start_iso)} · signed on {formatDate(next.signed_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StateBadge state="scheduled" />
                          {actions(next)}
                        </div>
                      </div>
                    </section>
                  )}
                  </div>
                  <div className="space-y-4">
                    <section className={card} aria-label="Key dates">
                      <h2 className={cardHeading}>Key dates</h2>
                      <dl className="divide-y divide-slate-100">
                        {keyDates.map(([Icon, label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <dt className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Icon size={15} className="text-brand-600" /> {label}</dt>
                            <dd className="text-[13px] font-bold text-navy-900">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    <section className={card} aria-label="Need help?">
                      <h2 className={cardHeading}>Need help?</h2>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><LifeBuoy size={16} /></span>
                        <div>
                          <p className="text-xs leading-5 text-slate-600">Questions about your agreement or its dates? Write to us and mention your agreement number.</p>
                          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#1265c8] hover:underline"><Mail size={13} /> {SUPPORT_EMAIL}</a>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              <section className={card} aria-label="Agreement history">
                <h2 className={cardHeading}>Agreement history</h2>
                {history.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs font-medium text-slate-500">No earlier versions.</p>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[820px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#dce6f1] text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                            {['Agreement no.', 'Version', 'Period', 'Signed on', 'Signed by', 'State', ''].map((heading) => <th key={heading || 'actions'} className="px-4 py-2">{heading}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {history.map((item) => (
                            <tr key={item.agreement_id} className="text-slate-700 transition hover:bg-[#f4f8fc]">
                              <td className="px-4 py-2.5 font-bold text-navy-900">{item.agreement_no}</td>
                              <td className="px-4 py-2.5">{item.version}</td>
                              <td className="px-4 py-2.5">{formatPeriod(item)}</td>
                              <td className="px-4 py-2.5">{item.signed_at ? formatDate(item.signed_at) : '—'}</td>
                              <td className="px-4 py-2.5">{item.signer_name || '—'}</td>
                              <td className="px-4 py-2.5"><StateBadge state={item.derived_state} />{item.derived_state === 'scheduled' && <span className="mt-0.5 block text-[11px] text-slate-500">Starts {formatDate(item.start_iso)}</span>}</td>
                              <td className="px-4 py-2.5">{actions(item)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ul className="divide-y divide-slate-100 md:hidden">
                      {history.map((item) => (
                        <li key={item.agreement_id} className="space-y-2 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-bold text-navy-900">{item.agreement_no} <span className="font-semibold text-slate-500">· v{item.version}</span></p>
                            <StateBadge state={item.derived_state} />
                          </div>
                          <p className="text-xs text-slate-600">{formatPeriod(item)}</p>
                          <p className="text-xs text-slate-500">{item.signed_at ? `Signed ${formatDate(item.signed_at)} by ${item.signer_name || '—'}` : 'Not signed yet'}</p>
                          {actions(item)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </PageContainer>
      <AgreementViewDialog agreement={viewing} onClose={() => setViewing(null)} />
    </AppShell>
  )
}
