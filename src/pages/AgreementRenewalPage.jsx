import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import Button from '../components/common/Button'
import Loader from '../components/common/Loader'
import AgreementPdfViewer from '../components/agreement/AgreementPdfViewer'
import AgreementSignPanel from '../components/agreement/AgreementSignPanel'
import DeclineDialog from '../components/agreement/DeclineDialog'
import { CHECK_ROW, SMALL_BUTTON, formatPeriod } from '../components/agreement/agreementUtils'
import { getMyAgreements } from '../api/vendorApi'

// Signing a renewed agreement while the vendor stays active: the details are unchanged, so it is just read and sign.
export default function AgreementRenewalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(undefined) // undefined = loading, null = not signable
  const [error, setError] = useState('')
  const [readOk, setReadOk] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)

  useEffect(() => {
    let ignore = false
    getMyAgreements()
      .then((list) => { if (!ignore) setAgreement(list.find((item) => String(item.agreement_id) === String(id) && item.can_sign) || null) })
      .catch((err) => { if (!ignore) { setError(err.message); setAgreement(null) } })
    return () => { ignore = true }
  }, [id])

  const back = (
    <Link to="/agreements" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-navy-900"><ArrowLeft size={15} /> Back to agreements</Link>
  )

  return (
    <AppShell breadcrumb="Agreement">
      <PageContainer wide className="vendor-workspace h-full">
        <div className="mx-auto flex h-full max-w-[1100px] min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-4 sm:px-2">
          <div className="shrink-0 px-1">
            {back}
            <h1 className="mt-2 text-lg font-extrabold text-[#0b2b52]">Review and sign your renewed agreement</h1>
            {agreement && <p className="mt-1 text-xs text-[#59728f]">{agreement.agreement_no} · Version {agreement.version} · {formatPeriod(agreement)}</p>}
            <p className="mt-1 text-xs text-[#59728f]">Your details are unchanged from your onboarding.</p>
          </div>

          {agreement === undefined && <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-600"><Loader /> Loading…</div>}
          {agreement === null && (
            <section className="rounded-lg border border-[#dce6f1] bg-white px-6 py-8 text-center">
              <p className="text-sm font-bold text-navy-900">{error || 'This agreement is no longer waiting for your signature.'}</p>
              <Button className={`${SMALL_BUTTON} mt-4`} onClick={() => navigate('/agreements', { replace: true })}>Go to agreements</Button>
            </section>
          )}
          {agreement && (
            <>
              <section className="space-y-3 rounded-lg border border-[#dce6f1] bg-white p-4">
                <AgreementPdfViewer agreementId={agreement.agreement_id} agreementNo={agreement.agreement_no} className="h-[60vh] min-h-[400px]" />
                <label className={CHECK_ROW}>
                  <input type="checkbox" className="mt-0.5 size-4.5 shrink-0 accent-brand-600" checked={readOk} onChange={(event) => setReadOk(event.target.checked)} />
                  <span className="text-[13px] font-semibold leading-5 text-navy-900">I have read the agreement</span>
                </label>
              </section>
              <section className="rounded-lg border border-[#dce6f1] bg-white p-4">
                <h2 className="mb-3 text-[13px] font-extrabold text-navy-900">Sign</h2>
                <AgreementSignPanel
                  agreement={agreement}
                  canSign={readOk}
                  onDecline={() => setDeclineOpen(true)}
                  blockedNote="Tick “I have read the agreement” above to sign."
                  onSigned={() => navigate('/agreements', { replace: true })}
                  onStale={() => navigate('/agreements', { replace: true })}
                />
              </section>
            </>
          )}
        </div>
      </PageContainer>
      {agreement && (
        <DeclineDialog
          open={declineOpen}
          agreementId={agreement.agreement_id}
          title="I cannot sign this"
          description="Tell us why. Our team will review it and may send you a corrected agreement. Your current agreement stays in force."
          onClose={() => setDeclineOpen(false)}
          onDeclined={() => navigate('/agreements', { replace: true })}
        />
      )}
    </AppShell>
  )
}
