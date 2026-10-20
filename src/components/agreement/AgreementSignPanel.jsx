import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, Mail, PenLine, RefreshCw } from 'lucide-react'
import Button from '../common/Button'
import Loader from '../common/Loader'
import SignatureInput from './SignatureInput'
import AgreementSummaryCard from './AgreementSummaryCard'
import { sendAgreementCode, signAgreement, verifyAgreementCode } from '../../api/vendorApi'
import { SMALL_BUTTON } from './agreementUtils'

const label = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900'
const SUCCESS_MS = 1600

// One step of the vertical stepper: a numbered badge on a rail, a title with its helper, then the content.
const Section = ({ number, title, helper, last = false, children }) => (
  <li className="relative pl-11">
    <span className="absolute left-0 top-0 grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{number}</span>
    {!last && <span className="absolute -bottom-6 left-[13px] top-8 w-px bg-slate-200" aria-hidden="true" />}
    <h3 className="text-sm font-bold leading-7 text-navy-900">{title}</h3>
    {helper && <p className="-mt-0.5 text-xs leading-5 text-slate-500">{helper}</p>}
    <div className="mt-3">{children}</div>
  </li>
)

// Signer name and designation, the signature, the one-time code and the Sign button (in a sticky footer). `canSign`
// says whether the steps before this one are done; `onStale` is called when the agreement can no longer be signed and
// the vendor asks to refresh. After signing, "Agreement signed" shows for a moment before `onSigned` runs.
export default function AgreementSignPanel({ agreement, vendorName = '', canSign = true, blockedNote = '', onSigned, onStale, onDecline, footerStart = null, fill = false }) {
  const agreementId = agreement.agreement_id
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [signature, setSignature] = useState(null)
  const [sentTo, setSentTo] = useState('')
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [signError, setSignError] = useState('')
  const [stale, setStale] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (countdown <= 0) return undefined
    const tick = setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => clearTimeout(tick)
  }, [countdown])

  const sendCode = async () => {
    setSending(true)
    setCodeError('')
    setSignError('')
    try {
      const result = await sendAgreementCode(agreementId)
      setSentTo(result?.sent_to || 'your registered email')
      setCountdown(Number(result?.resend_after_seconds) || 60)
      setOtp('')
      setVerified(false)
    } catch (err) {
      if (err.status === 429) setCountdown(err.retryAfter || 60)
      setCodeError(err.message)
      if (err.status === 409 || err.status === 410) setStale(true)
    } finally {
      setSending(false)
    }
  }

  const verify = async () => {
    setVerifying(true)
    setCodeError('')
    try {
      await verifyAgreementCode(agreementId, otp)
      setVerified(true)
    } catch (err) {
      const left = err.body?.attempts_left
      setCodeError(Number.isFinite(left) ? `${err.message} ${left} ${left === 1 ? 'attempt' : 'attempts'} left.` : err.message)
      if (err.status === 409 || err.status === 410) setStale(true)
    } finally {
      setVerifying(false)
    }
  }

  const ready = canSign && name.trim() && designation.trim() && signature && verified && !stale

  const sign = async () => {
    setSigning(true)
    setSignError('')
    try {
      const result = await signAgreement(agreementId, {
        signer_name: name.trim(),
        signer_designation: designation.trim(),
        method: signature.method,
        signature: signature.dataUrl,
        details_confirmed: true,
      })
      setDone(true)
      timer.current = setTimeout(() => onSigned?.(result), SUCCESS_MS)
    } catch (err) {
      if (err.status === 403) {
        setVerified(false)
        setSignError(err.message || 'Please verify the code sent to your email, then sign again.')
      } else {
        if (err.status === 409 || err.status === 410) setStale(true)
        setSignError(err.message)
      }
    } finally {
      setSigning(false)
    }
  }

  if (done) {
    return (
      <div className="grid min-h-[300px] place-items-center text-center" role="status">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-navy-950">Agreement signed</h2>
          <p className="mt-1 text-sm text-slate-600">Thank you. Taking you to the next screen…</p>
        </div>
      </div>
    )
  }

  const missing = [
    !canSign && 'earlier steps',
    !name.trim() && 'signer name',
    !designation.trim() && 'designation',
    !signature && 'signature',
    !verified && 'email code',
  ].filter(Boolean)
  const complete = ready && missing.length === 0

  const checks = [!!name.trim(), !!designation.trim(), !!signature, verified]
  const doneCount = checks.filter(Boolean).length
  const footer = (
    <div className={`border-t border-slate-200 bg-white ${fill ? '-mx-4 -mb-3 shrink-0 px-4 sm:-mx-6 sm:px-6' : 'sticky bottom-0 z-10 mt-4 px-1'}`}>
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 py-2">
        {footerStart}
        {onDecline && (
          <Button variant="secondary" className={`${SMALL_BUTTON} whitespace-nowrap`} onClick={onDecline}>Decline agreement</Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {complete ? (
            <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-emerald-700" role="status"><CheckCircle2 size={15} /> Ready to sign</p>
          ) : (
            <p className="hidden whitespace-nowrap text-xs font-semibold text-slate-500 sm:block" title={!canSign ? blockedNote : `Still needed: ${missing.join(', ')}`}>{doneCount} of {checks.length} completed</p>
          )}
          <Button className={`${SMALL_BUTTON} shrink-0`} onClick={sign} disabled={!ready || signing} aria-busy={signing}>
            {signing ? <><Loader /> Signing…</> : <><PenLine size={15} /> Sign agreement</>}
          </Button>
        </div>
      </div>
      {!complete && missing.length > 0 && (
        <p className="mx-auto w-full max-w-3xl pb-2 text-[11px] text-slate-500 sm:hidden">Still needed: {missing.join(', ')}</p>
      )}
    </div>
  )

  const body = (
    <div className="mx-auto w-full max-w-3xl pb-4">
      <div className="min-w-0 flex-1 space-y-3">
      <AgreementSummaryCard agreement={agreement} vendorName={vendorName} />

      <section className="rounded-xl border border-[#dce6f1] bg-white px-5 py-5">
        <ol className="space-y-6">
          <Section number="1" title="Your details">
            <div className="space-y-3">
              <div>
                <label htmlFor="signer-name" className={label}>Signer name <span className="text-red-600" aria-hidden="true">*</span></label>
                <input id="signer-name" className="app-field h-10" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="signer-designation" className={label}>Designation <span className="text-red-600" aria-hidden="true">*</span></label>
                <input id="signer-designation" className="app-field h-10" value={designation} maxLength={120} placeholder="e.g. Director, Proprietor" onChange={(event) => setDesignation(event.target.value)} />
              </div>
            </div>
          </Section>

          <Section number="2" title="Verify your email" helper="We email a 6-digit code to your registered email. It is valid for 10 minutes.">
            {verified ? (
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-700" role="status"><Check size={15} /> Email verified</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={sentTo ? 'secondary' : 'primary'} className={SMALL_BUTTON} onClick={sendCode} disabled={sending || countdown > 0 || stale}>
                    {sending ? <Loader /> : sentTo ? <RefreshCw size={15} /> : <Mail size={15} />}
                    {sentTo ? (countdown > 0 ? `Resend in ${countdown}s` : 'Resend code') : 'Send code'}
                  </Button>
                  {sentTo && <p className="text-xs text-slate-500" role="status">Code sent to <b className="font-bold text-navy-900">{sentTo}</b></p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="agreement-otp" className="sr-only">Enter the 6-digit code</label>
                  <input
                    id="agreement-otp"
                    className="app-field h-10 w-[180px] text-center font-mono text-base tracking-[0.35em]"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    disabled={!sentTo}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(event) => { if (event.key === 'Enter' && otp.length === 6 && !verifying) verify() }}
                  />
                  <Button className={SMALL_BUTTON} onClick={verify} disabled={!sentTo || otp.length !== 6 || verifying}>{verifying ? <Loader /> : null} Verify code</Button>
                </div>
              </div>
            )}
            {codeError && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{codeError}</p>}
          </Section>

          <Section number="3" title="Your signature" helper="Draw, type or upload your signature." last>
            <SignatureInput defaultText={name} onChange={setSignature} />
          </Section>
        </ol>
      </section>

      {signError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{signError}</p>}
      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs leading-5 text-amber-900">This agreement can no longer be signed. Refresh to see its latest status.</p>
          <Button variant="secondary" className={SMALL_BUTTON} onClick={() => onStale?.()}><RefreshCw size={15} /> Refresh</Button>
        </div>
      )}
      </div>
    </div>
  )

  // `fill`: the panel fills a fixed-height parent, only the body scrolls and the footer bar stays put.
  return fill ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">{body}</div>
      {footer}
    </div>
  ) : (
    <div>
      {body}
      {footer}
    </div>
  )
}
