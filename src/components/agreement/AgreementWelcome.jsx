import { useState } from 'react'
import { Check, Clock3, Eye, EyeOff, FileSignature, FileText, KeyRound, PartyPopper, PenLine, ShieldCheck, UserCheck } from 'lucide-react'
import Button from '../common/Button'
import Loader from '../common/Loader'
import { changePassword } from '../../api/vendorApi'
import { SMALL_BUTTON } from './agreementUtils'

const field = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900'
const OVERVIEW = [
  { icon: UserCheck, title: 'Review your details', text: 'Check the company, tax, address and bank details we hold for you.', hint: 'About 1 minute' },
  { icon: FileText, title: 'Read the agreement', text: 'See the key terms at a glance, then read the full agreement.', hint: 'About 1 minute' },
  { icon: PenLine, title: 'Sign', text: 'Add your signature and confirm it with a code sent to your email.', hint: 'About 1 minute' },
]

const OPTIONS = [
  ['keep', 'Keep the password I was sent', 'Use the password from your welcome email. You can change it later.'],
  ['new', 'Choose a new password', 'Recommended: pick one only you know.'],
]

// A rough strength reading for the new password: length first, then a mix of letters, digits and symbols.
function strengthOf(value) {
  if (!value) return { score: 0, label: '' }
  if (value.length < 8) return { score: 0, label: 'Too short' }
  let score = 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] }
}

const STRENGTH_TONE = ['bg-slate-200', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600']

// A password box with a show / hide toggle.
function PasswordField({ id, label, value, onChange, autoComplete, maxLength, children }) {
  const [shown, setShown] = useState(false)
  return (
    <div>
      <label htmlFor={id} className={field}>{label}</label>
      <div className="relative">
        <input id={id} type={shown ? 'text' : 'password'} className="app-field pr-10" autoComplete={autoComplete} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />
        <button
          type="button"
          onClick={() => setShown((prev) => !prev)}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-slate-500 transition hover:text-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {children}
    </div>
  )
}

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>
      <span className={`grid size-4 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{ok ? <Check size={11} strokeWidth={3} /> : <span className="size-1 rounded-full bg-slate-400" />}</span>
      {children}
    </li>
  )
}

// The first screen of the agreement flow, for every vendor. Maker-created vendors also get the optional password choice.
export default function AgreementWelcome({ vendorName, email, selfService, agreement, onStart }) {
  const [choice, setChoice] = useState('keep')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const months = agreement?.key_terms?.term_months
  const strength = strengthOf(next)

  const problem = (() => {
    if (choice !== 'new') return ''
    if (!current) return 'Enter the password we emailed you.'
    if (next.length < 8 || next.length > 64) return 'The new password must be 8 to 64 characters.'
    if (next === current) return 'The new password must be different from the current one.'
    if (next !== confirm) return 'The two new passwords do not match.'
    return ''
  })()

  const start = async () => {
    setError('')
    if (selfService || choice === 'keep') { onStart(); return }
    if (problem) { setError(problem); return }
    setBusy(true)
    try {
      await changePassword(current, next)
      onStart()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-[#eef7ff] to-white px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <span className="grid size-12 place-items-center rounded-full bg-brand-100 text-brand-700"><PartyPopper size={26} /></span>
          <p className="eyebrow mt-3">Final stage</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.03em] text-navy-950">
            {selfService ? 'Great news, you have reached the final stage' : `Welcome${vendorName ? `, ${vendorName}` : ''}`}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {selfService
              ? 'Your application has been reviewed and is ready for the final step: a short agreement to sign.'
              : <>You have been registered as a vendor{email ? <> with <b className="font-bold text-navy-900">{email}</b></> : ''}. The final step is a short agreement to review and sign. After our team gives the final approval, your account goes live.</>}
          </p>
        </div>
        {agreement && (
          <div className="w-full shrink-0 rounded-lg border border-[#dce6f1] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(16,42,76,0.08)] md:w-64">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Your agreement</p>
            <p className="mt-1 text-lg font-extrabold text-navy-950">{agreement.agreement_no}</p>
            <p className="text-xs font-semibold text-slate-500">Version {agreement.version}{months != null ? ` · Valid for ${months} ${Number(months) === 1 ? 'month' : 'months'}` : ''}</p>
          </div>
        )}
      </section>

      <ol className="grid gap-3 md:grid-cols-3" aria-label="What happens next">
        {OVERVIEW.map(({ icon: Icon, title, text, hint }, index) => (
          <li key={title} className="flex flex-col rounded-xl border border-[#dce6f1] bg-[#f7fafd] px-4 py-4">
            <span className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-white"><Icon size={19} /></span>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Step {index + 1}</span>
            </span>
            <p className="mt-3 text-sm font-extrabold text-navy-900">{title}</p>
            <p className="mt-1 flex-1 text-xs leading-5 text-slate-600">{text}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Clock3 size={13} className="text-brand-600" /> {hint}</p>
          </li>
        ))}
      </ol>

      {!selfService && (
        <section className="overflow-hidden rounded-xl border border-[#dce6f1] bg-white" aria-label="Set your own password">
          <div className="flex items-center gap-3 border-b border-blue-100 bg-[#eef7ff] px-4 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><KeyRound size={15} /></span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-extrabold text-navy-900">Set your own password</h3>
              <p className="text-xs text-slate-600">Optional. You can also change it later from your profile.</p>
            </div>
          </div>
          <div className="space-y-3 px-4 py-3.5">
            <div role="radiogroup" aria-label="Password choice" className="grid gap-2.5 md:grid-cols-2">
              {OPTIONS.map(([value, title, hint]) => {
                const on = choice === value
                return (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${on ? 'border-brand-600 bg-[#eef6ff] ring-1 ring-brand-600' : 'border-[#dce6f1] bg-[#f7fafd] hover:border-slate-300'}`}>
                    <input type="radio" name="password-choice" className="mt-0.5 size-4.5 shrink-0 accent-brand-600" checked={on} onChange={() => { setChoice(value); setError('') }} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-extrabold leading-5 text-navy-900">{title}</span>
                      <span className="block text-xs leading-5 text-slate-600">{hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            {choice === 'new' && (
              <div className="grid gap-4 border-t border-slate-100 pt-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                <PasswordField id="pw-current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password">
                  <p className="mt-1 text-[11px] text-slate-500">The one from your welcome email.</p>
                </PasswordField>
                <div className="space-y-3">
                  <PasswordField id="pw-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" maxLength={64}>
                    <div className="mt-1.5" aria-live="polite">
                      <div className="flex gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full transition ${strength.score >= step ? STRENGTH_TONE[strength.score] : 'bg-slate-200'}`} />)}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">{next ? `Strength: ${strength.label}` : '8 to 64 characters.'}</p>
                    </div>
                  </PasswordField>
                  <PasswordField id="pw-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" maxLength={64} />
                </div>
                <ul className="space-y-1.5 self-start rounded-xl border border-[#dce6f1] bg-[#f7fafd] px-3.5 py-3" aria-label="Password requirements">
                  <li className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Your new password</li>
                  <Rule ok={next.length >= 8 && next.length <= 64}>Is 8 to 64 characters</Rule>
                  <Rule ok={Boolean(next) && Boolean(current) && next !== current}>Differs from the current one</Rule>
                  <Rule ok={Boolean(next) && next === confirm}>Matches the confirmation</Rule>
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs leading-5 text-slate-600">
          <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
          You can leave and come back; nothing is signed until you press Sign agreement.
        </p>
        <Button className={`${SMALL_BUTTON} shrink-0`} onClick={start} disabled={busy} aria-busy={busy}>
          {busy ? <><Loader /> Saving…</> : <><FileSignature size={15} /> Get started</>}
        </Button>
      </div>
    </div>
  )
}
