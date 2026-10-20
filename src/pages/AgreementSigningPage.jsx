import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, MessageSquareWarning, RefreshCw } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import Button from '../components/common/Button'
import Loader from '../components/common/Loader'
import AgreementSignPanel from '../components/agreement/AgreementSignPanel'
import DeclineDialog from '../components/agreement/DeclineDialog'
import DetailsReview from '../components/agreement/DetailsReview'
import AgreementUpdated from '../components/agreement/AgreementUpdated'
import AgreementWelcome from '../components/agreement/AgreementWelcome'
import AgreementReadStep from '../components/agreement/AgreementReadStep'
import { SMALL_BUTTON } from '../components/agreement/agreementUtils'
import { getMyAgreements } from '../api/vendorApi'
import useAuth from '../hooks/useAuth'

const STEPS = [
  { id: 1, title: 'Review your details', heading: 'Review your details', intro: 'Please check that the details we hold for you are correct before you sign.' },
  { id: 2, title: 'Read the agreement', heading: 'Read the agreement', intro: 'Read the whole agreement. You can open it in a new tab or download a copy.' },
  { id: 3, title: 'Sign', heading: 'Sign the agreement', intro: 'Add your name, your signature and the code we email you.' },
]
// The vendor reviews their details, reads the agreement and signs it (stage "agreement").
export default function AgreementSigningPage() {
  const { profile, user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const agreement = profile?.agreement || null
  const selfService = profile?.source === 'self_service'
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState(null) // the list entry for this agreement (it carries the key terms)
  const [detailsOk, setDetailsOk] = useState(false)
  const [readOk, setReadOk] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [moving, setMoving] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  const agreementId = agreement?.agreement_id
  useEffect(() => {
    if (!agreementId) return undefined
    let ignore = false
    getMyAgreements().then((list) => { if (!ignore) setDetails(list.find((item) => item.agreement_id === agreementId) || null) }).catch(() => {})
    return () => { ignore = true }
  }, [agreementId])
  const shown = agreement ? { ...details, ...agreement, key_terms: agreement.key_terms || details?.key_terms, company_name: agreement.company_name || details?.company_name } : null
  // A re-issued agreement (version 2 or later) opens on what changed, then goes through every step again.
  const updateInfo = shown?.update_info || null
  const firstStep = 1

  const vendorName = profile?.vendor_legal_name || profile?.name || ''

  // After signing or declining the stage changes, so the profile is reloaded and the vendor lands on the status page.
  const leave = async () => {
    setMoving(true)
    setRefreshError('')
    try {
      await refreshProfile()
      navigate('/application-status', { replace: true })
    } catch {
      setRefreshError('Unable to refresh. Please try again.')
      setMoving(false)
    }
  }
  const onSigned = async () => {  // runs after the "Agreement signed" moment
    await refreshProfile().catch(() => {})
    navigate('/application-status', { replace: true })
  }

  if (declined) {
    return (
      <AppShell breadcrumb="Vendor agreement">
        <PageContainer className="max-w-xl">
          <section className="rounded-2xl border border-blue-200/80 bg-white px-6 py-10 text-center shadow-[0_22px_60px_rgba(40,83,130,0.1)] sm:px-10">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-100 text-brand-700"><CheckCircle2 size={26} /></span>
            <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-navy-950">Thanks, we have told our team</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Our team will look at what you reported and send you a corrected agreement. You will get an email when it is ready.</p>
            {refreshError && <p role="alert" className="mt-3 text-xs font-medium text-red-600">{refreshError}</p>}
            <Button className={`${SMALL_BUTTON} mt-6`} onClick={leave} disabled={moving}>{moving ? <Loader /> : null} Continue</Button>
          </section>
        </PageContainer>
      </AppShell>
    )
  }

  if (!agreement) {
    return (
      <AppShell breadcrumb="Vendor agreement">
        <PageContainer className="max-w-xl">
          <section className="rounded-2xl border border-blue-200/80 bg-white px-6 py-10 text-center shadow-[0_22px_60px_rgba(40,83,130,0.1)]">
            <h1 className="text-xl font-extrabold text-navy-950">Your agreement is not available right now</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">It may have been withdrawn or replaced by our team. Refresh to see where your application stands.</p>
            {refreshError && <p role="alert" className="mt-3 text-xs font-medium text-red-600">{refreshError}</p>}
            <Button className={`${SMALL_BUTTON} mt-6`} onClick={leave} disabled={moving}>{moving ? <Loader /> : <RefreshCw size={15} />} Refresh</Button>
          </section>
        </PageContainer>
      </AppShell>
    )
  }

  const current = STEPS.find((item) => item.id === step)
  const back = step > firstStep ? <Button variant="secondary" className={SMALL_BUTTON} onClick={() => setStep(step - 1)}>Back</Button> : null

  return (
    <AppShell breadcrumb="Vendor agreement">
      <PageContainer wide className="vendor-workspace h-full">
        <section className="vendor-workspace__card grid min-h-0 overflow-hidden rounded-xl border border-blue-200/80 bg-white shadow-[0_12px_36px_rgba(40,83,130,0.08)] lg:h-[calc(100svh-6rem)] lg:min-h-[600px] lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 flex-col overflow-hidden border-r border-blue-100 bg-[#eef7ff] p-5 lg:flex xl:p-6">
            <div>
              <p className="eyebrow">Vendor agreement</p>
              <h1 className="mt-3 text-2xl font-extrabold leading-[1.12] tracking-[-0.035em] text-navy-950">Sign your vendor agreement</h1>
              <p className="mt-3 text-xs leading-5 text-slate-600">Sign the agreement to move on to the final approval.</p>
              <p className="mt-3 rounded-lg border border-blue-200/80 bg-white/75 px-3 py-2 text-[11px] font-bold text-navy-900">{agreement.agreement_no}{agreement.version ? ` · Version ${agreement.version}` : ''}</p>
            </div>
            <div className="mt-auto pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Progress</p>
              <ol className="mt-3 space-y-2">
                <li className="flex items-center gap-3" aria-current={step === 0 ? 'step' : undefined}>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${step > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-600 text-white'}`}>
                    {step > 0 ? <BadgeCheck size={14} /> : <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                  <span className={`text-xs font-semibold ${step === 0 ? 'text-navy-900' : 'text-slate-500'}`}>{updateInfo ? 'Updated agreement' : 'Welcome'}</span>
                </li>
                {STEPS.map((item) => (
                  <li key={item.id} className="flex items-center gap-3" aria-current={item.id === step ? 'step' : undefined}>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${item.id < step ? 'bg-emerald-100 text-emerald-700' : item.id === step ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-500'}`}>
                      {item.id < step ? <BadgeCheck size={14} /> : item.id}
                    </span>
                    <span className={`text-xs font-semibold ${item.id === step ? 'text-navy-900' : 'text-slate-500'}`}>{item.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col px-4 py-3 sm:px-6 xl:px-7">
            {step === 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {updateInfo
                  ? <AgreementUpdated agreement={shown} onStart={() => setStep(firstStep)} />
                  : <AgreementWelcome vendorName={vendorName} email={user?.email} selfService={selfService} agreement={shown} onStart={() => setStep(1)} />}
              </div>
            ) : step === 2 ? (
              <AgreementReadStep
                agreement={shown}
                readOk={readOk}
                onReadChange={setReadOk}
                onBack={back ? () => setStep(1) : null}
                onContinue={() => setStep(3)}
              />
            ) : (
              <>
                <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-slate-100 pb-2">
                  <p className="w-full text-xs font-bold uppercase tracking-wider text-brand-600 lg:hidden">Step {step} of {STEPS.length}</p>
                  <h2 className="text-xl font-extrabold tracking-[-0.03em] text-navy-950">{current.heading}</h2>
                  <p className="text-xs text-slate-600">{current.intro}</p>
                </header>

                <div className={`flex min-h-0 flex-1 flex-col ${step === 3 ? '' : 'overflow-y-auto'}`}>
                  {step === 1 && (
                    <>
                      {updateInfo?.details_changed && <p className="mb-2 inline-flex self-start rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">Details changed since the last version</p>}
                      <DetailsReview profile={profile} updateInfo={updateInfo} />
                    </>
                  )}
                  {step === 3 && (
                    <AgreementSignPanel
                      agreement={shown}
                      vendorName={vendorName}
                      canSign={detailsOk && readOk}
                      blockedNote="Confirm your details and tick “I have read the agreement” in the earlier steps to sign."
                      onSigned={onSigned}
                      onStale={leave}
                      onDecline={() => setDeclineOpen(true)}
                      footerStart={back}
                      fill
                    />
                  )}
                </div>

                {step === 1 && (
                  <footer className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#dce6f1] bg-[#f7fafd] px-3 py-2 transition hover:border-slate-300 sm:flex-1">
                      <input type="checkbox" className="size-4.5 shrink-0 accent-brand-600" checked={detailsOk} onChange={(event) => setDetailsOk(event.target.checked)} />
                      <span className="text-[13px] font-semibold leading-5 text-navy-900">These details are correct</span>
                    </label>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" className={SMALL_BUTTON} onClick={() => setDeclineOpen(true)}><MessageSquareWarning size={15} /> Something is wrong</Button>
                      <Button className={SMALL_BUTTON} onClick={() => setStep(2)} disabled={!detailsOk}>Continue</Button>
                    </div>
                  </footer>
                )}
              </>
            )}
          </div>
        </section>
      </PageContainer>
      <DeclineDialog
        open={declineOpen}
        agreementId={agreement.agreement_id}
        title={step === 3 ? 'I cannot sign this' : 'Something is wrong'}
        atStep={step === 1 ? 'review' : 'sign'}
        onClose={() => setDeclineOpen(false)}
        onDeclined={() => { setDeclineOpen(false); setDeclined(true) }}
      />
    </AppShell>
  )
}
