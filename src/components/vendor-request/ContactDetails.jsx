import { BadgeCheck, MailCheck, Phone } from 'lucide-react'
import Input from '../common/Input'
import Loader from '../common/Loader'
import PhoneInput from '../common/PhoneInput'
import FormSection from './FormSection'
import EmailVerificationPanel from './EmailVerificationPanel'
import { checkEmailExists } from '../../api/vendorApi'
import useDuplicateCheck from '../../hooks/useDuplicateCheck'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The first thing a vendor fills in: a verified email and a valid phone number. Until both are done the
// vendor information below stays locked (see VendorRequestPage).
export default function ContactDetails({ register, errors, watch, setValue, setError, clearErrors, emailVerification, emailTaken, onEmailTakenChange, onEmailCheckingChange, takenRef }) {
  const vendorEmail = watch('vendorEmail')?.trim() || ''

  const checkingEmail = useDuplicateCheck({
    value: vendorEmail,
    isValid: EMAIL_PATTERN.test(vendorEmail),
    checkFn: checkEmailExists,
    message: 'This email already exists.',
    fieldName: 'vendorEmail',
    setError,
    clearErrors,
    onTakenChange: onEmailTakenChange,
    onCheckingChange: onEmailCheckingChange,
    takenRef,
  })

  const canVerifyEmail = EMAIL_PATTERN.test(vendorEmail) && !errors.vendorEmail && !emailTaken && !checkingEmail
    && !emailVerification.busy && !emailVerification.pending

  return (
    <FormSection icon={Phone} title="Contact details" description="Verify your email and enter a phone number to unlock the rest of the form.">
      <div className="grid gap-x-3.5 gap-y-3 sm:grid-cols-2">
        <Input
          label="Email address"
          name="vendorEmail"
          type="email"
          register={register}
          error={errors.vendorEmail}
          hint={checkingEmail ? 'Checking availability…' : emailVerification.verified ? 'Email verified.' : 'Verify your email address to continue.'}
          locked={emailVerification.verified}
          required
          action={emailVerification.verified ? (
            <>
              <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
                <BadgeCheck size={14} /> Verified
              </span>
              <button
                type="button"
                onClick={emailVerification.reset}
                className="shrink-0 rounded px-1 py-2 text-[11px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2 transition hover:text-brand-700 hover:decoration-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              >
                Change
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={emailVerification.send}
              disabled={!canVerifyEmail}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 text-xs font-bold text-brand-700 transition hover:border-brand-500 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send a verification code to this email address"
            >
              {emailVerification.busy && !emailVerification.pending ? <Loader /> : <MailCheck size={14} />}
              Verify
            </button>
          )}
        />
        <PhoneInput
          label="Phone number"
          name="vendorPhone"
          codeName="vendorPhoneCode"
          register={register}
          watch={watch}
          setValue={setValue}
          error={errors.vendorPhone}
          hint={watch('vendorPhoneCode') === '+91' ? '10-digit mobile number' : 'Number without the country code'}
          required
        />
        <EmailVerificationPanel email={vendorEmail} verification={emailVerification} />
      </div>
    </FormSection>
  )
}
