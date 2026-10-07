import { useEffect, useState } from 'react'
import { MailCheck } from 'lucide-react'
import Button from '../common/Button'
import Loader from '../common/Loader'

const CODE_PATTERN = /^\d{6}$/

// Shown under the email field while a code is pending (or a verification just failed). The code can be typed here,
// or the link in the email opened on any device: the status is polled, so this panel disappears either way.
export default function EmailVerificationPanel({ email, verification }) {
  const { pending, busy, error, attemptsRemaining, resendAt, send, submitCode } = verification
  const [code, setCode] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    setNow(Date.now())
    if (resendAt <= Date.now()) return undefined
    const timer = setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (tick >= resendAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendAt])

  if (!pending && !error) return null

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const confirm = () => {
    if (CODE_PATTERN.test(code) && !busy) submitCode(code)
  }
  const resend = async () => {
    setCode('')
    await send()
  }

  return (
    <div className="col-span-full rounded-lg border border-blue-100 bg-[#f4f9ff] px-3 py-3" aria-live="polite">
      {pending && (
        <>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-700">
            <MailCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              We sent a 6-digit code to <strong className="break-all text-navy-900">{email}</strong>. Enter it below, or open the link in that email.
              It may take a minute and can land in spam.
            </span>
          </p>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="app-field w-full text-center font-mono text-base tracking-[0.4em] sm:max-w-44"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              aria-label="6-digit verification code"
              aria-invalid={Boolean(error)}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault() // would otherwise submit the whole request form
                confirm()
              }}
            />
            <Button type="button" onClick={confirm} disabled={busy || !CODE_PATTERN.test(code)}>
              {busy ? <><Loader /> Checking...</> : 'Confirm code'}
            </Button>
            <Button type="button" variant="ghost" onClick={resend} disabled={busy || waitSeconds > 0}>
              {waitSeconds > 0 ? `Resend in ${waitSeconds}s` : 'Resend code'}
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className={`text-xs font-medium text-red-600 ${pending ? 'mt-2' : ''}`}>
          {error}
          {pending && attemptsRemaining != null && ` ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} left.`}
        </p>
      )}
    </div>
  )
}
