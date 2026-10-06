import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, FileCheck2, Landmark, ShieldCheck, X } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import Button from '../components/common/Button'
import FormError from '../components/common/FormError'
import Loader from '../components/common/Loader'
import Modal from '../components/common/Modal'
import FormProgress from '../components/vendor-request/FormProgress'
import VendorInformation from '../components/vendor-request/VendorInformation'
import AddressAndTaxDetails from '../components/vendor-request/AddressAndTaxDetails'
import BankDetails from '../components/vendor-request/BankDetails'
import ReviewRequest from '../components/vendor-request/ReviewRequest'
import useVendorRequest from '../hooks/useVendorRequest'
import useEmailVerification from '../hooks/useEmailVerification'
import { FORM_STEPS, STEP_FIELDS } from '../utils/constants'
import { clearDraft } from '../utils/storage'
import SupportingDocuments from '../components/vendor-request/SupportingDocuments'
import { checkEmailExists, checkPanExists, createVendor, uploadVendorDocuments } from '../api/vendorApi'

const trustPoints = [
  { icon: ShieldCheck, label: 'Secure verification' },
  { icon: FileCheck2, label: 'Invoice-ready profile' },
  { icon: Landmark, label: 'Bank detail validation' },
]

const GST_MANAGED_FIELDS = ['vendorLegalName', 'registeredAddress1', 'registeredState', 'registeredPostalCode']

export default function VendorRequestPage() {
  const navigate = useNavigate()
  const form = useVendorRequest()
  const { register, watch, setValue, setError, clearErrors, trigger, reset, handleSubmit, formState: { errors } } = form
  const [step, setStep] = useState(1)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [panTaken, setPanTaken] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [checkingPan, setCheckingPan] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [gstLockedFields, setGstLockedFields] = useState(GST_MANAGED_FIELDS)
  // Supporting documents as { [typeKey]: File[] }. Files can't go in the form state or a saved draft, so they live here.
  const [documents, setDocuments] = useState({})
  const values = watch()
  // Lives here (not in step 1) so the verified email survives moving between steps.
  const emailVerification = useEmailVerification(values.vendorEmail)
  const currentFields = STEP_FIELDS[step - 1] || []
  const errorCount = currentFields.filter((name) => errors[name]).length
  const declarationsComplete = values.accurateDeclaration && values.termsDeclaration

  const setDocumentFiles = (type, files) => {
    setDocuments((current) => {
      const next = { ...current }
      if (files.length > 0) next[type] = files
      else delete next[type]
      return next
    })
  }

  const lockGstFields = (fields) => {
    setGstLockedFields((current) => [...new Set([...current, ...fields])])
  }

  const nextStep = async () => {
    setAttempted(true)
    setSubmitError('')
    const valid = await trigger(currentFields, { shouldFocus: true })
    if (!valid) return

    if (step === 1) {
      if (!emailVerification.verified) {
        setError('vendorEmail', { type: 'manual', message: 'Verify your email address to continue.' })
        return
      }
      setCheckingDuplicates(true)
      try {
        const normalizedEmail = values.vendorEmail.trim().toLowerCase()
        const normalizedPan = values.pan.trim().toUpperCase()
        const [emailExists, panExists] = await Promise.all([
          checkEmailExists(normalizedEmail),
          checkPanExists(normalizedPan),
        ])

        setEmailTaken(emailExists)
        setPanTaken(panExists)
        form.takenRef.current = { ...form.takenRef.current, pan: panExists ? normalizedPan : '', vendorEmail: emailExists ? normalizedEmail : '' }
        if (emailExists) setError('vendorEmail', { type: 'manual', message: 'This email already exists.' })
        else clearErrors('vendorEmail')
        if (panExists) setError('pan', { type: 'manual', message: 'This PAN already exists.' })
        else clearErrors('pan')
        if (emailExists || panExists) return
      } catch {
        setSubmitError('Email and PAN availability could not be verified. Please try again.')
        return
      } finally {
        setCheckingDuplicates(false)
      }
    }
    setAttempted(false)
    setStep((current) => Math.min(current + 1, 4))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const previousStep = () => {
    setAttempted(false)
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitRequest = handleSubmit(async (data) => {
    if (!declarationsComplete) return
    if (!emailVerification.verified) {
      setSubmitError('Verify your email address before submitting.')
      setStep(1)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const vendor = await createVendor(data, emailVerification.verificationId)
      // The request now exists, so a failed upload must not fail the submission (a retry would hit the duplicate
      // PAN / email check). It is reported on the confirmation page instead.
      let documentsFailed = false
      if (Object.keys(documents).length > 0) {
        try {
          await uploadVendorDocuments(vendor.vendor_id, documents)
        } catch {
          documentsFailed = true
        }
      }
      clearDraft()
      navigate('/request-success', {
        state: {
          requestId: `VR-${vendor.vendor_id}`,
          documentsFailed,
          vendorName: data.vendorLegalName,
          submissionDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        },
      })
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit vendor request. Please try again.')
      setSubmitting(false)
    }
  }, () => setAttempted(true))

  const discard = () => {
    clearDraft()
    reset()
    setDocuments({})
    setCancelOpen(false)
    navigate('/')
  }

  const renderStep = () => {
    const props = { register, errors, watch, setValue, setError, clearErrors, lockedFields: gstLockedFields, takenRef: form.takenRef }
    if (step === 1) {
      return (
        <VendorInformation
          {...props}
          emailVerification={emailVerification}
          emailTaken={emailTaken}
          onEmailTakenChange={setEmailTaken}
          onPanTakenChange={setPanTaken}
          onEmailCheckingChange={setCheckingEmail}
          onPanCheckingChange={setCheckingPan}
          onGstLookupSuccess={lockGstFields}
        />
      )
    }
    if (step === 2) return <AddressAndTaxDetails {...props} />
    if (step === 3) {
      return (
        <div className="space-y-3">
          <BankDetails {...props} />
          <SupportingDocuments documents={documents} onChange={setDocumentFiles} />
        </div>
      )
    }
    return (
      <ReviewRequest
        values={values}
        documents={documents}
        register={register}
        setValue={setValue}
        errors={errors}
        onEdit={(target) => setStep(target)}
        onBack={previousStep}
        submitting={submitting}
        declarationsComplete={declarationsComplete}
      />
    )
  }

  return (
    <AppShell backTo="/" onBack={() => setCancelOpen(true)}>
      <PageContainer wide className="vendor-workspace h-full">
        <section className="vendor-workspace__card grid h-full min-h-0 overflow-hidden rounded-xl border border-blue-200/80 bg-white shadow-[0_12px_36px_rgba(40,83,130,0.08)] lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 flex-col overflow-hidden border-r border-blue-100 bg-[#eef7ff] p-5 lg:flex xl:p-6">
            <div>
              <p className="eyebrow">Vendor onboarding</p>
              <h1 className="mt-3 text-2xl font-extrabold leading-[1.12] tracking-[-0.035em] text-navy-950">
                Request your vendor account
              </h1>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Complete your company, tax, address, and bank details to start managing invoices and payments.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {trustPoints.map(({ icon: Icon, label }) => (
                <div key={label} className="flex min-h-10 items-center gap-2.5 rounded-lg border border-blue-200/80 bg-white/75 px-3 text-[11px] font-bold text-navy-900">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                    <Icon size={16} />
                  </span>
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Application progress</p>
              <div className="mt-3 space-y-2">
                {FORM_STEPS.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${item.id < step ? 'bg-emerald-100 text-emerald-700' : item.id === step ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-500'}`}>
                      {item.id < step ? <BadgeCheck size={14} /> : item.id}
                    </span>
                    <span className={`text-xs font-semibold ${item.id === step ? 'text-navy-900' : 'text-slate-500'}`}>{item.longTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col px-4 py-3 sm:px-6 xl:px-7">
            <header className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy-950 sm:text-2xl">Request vendor account</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">{FORM_STEPS[step - 1].longTitle} · Fields marked with an asterisk are required.</p>
              </div>
            </header>

            <FormProgress currentStep={step} />
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitRequest} noValidate>
              <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
                {attempted && <FormError count={errorCount} />}
                {submitError && (
                  <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span className="font-semibold">Submission failed.</span> {submitError}
                  </div>
                )}

                {renderStep()}
              </div>

              {step !== 4 && (
                <div className="z-20 mt-3 shrink-0 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_-4px_18px_rgba(16,42,76,0.05)] sm:p-2.5">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <Button type="button" variant="ghost" onClick={() => setCancelOpen(true)}><X size={17} /> Cancel</Button>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      {step > 1 && <Button type="button" variant="secondary" onClick={previousStep}><ArrowLeft size={17} /> Back</Button>}
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={checkingDuplicates || checkingEmail || checkingPan || emailTaken || panTaken || (step === 1 && !emailVerification.verified)}
                      >
                        {checkingDuplicates || checkingEmail || checkingPan ? <><Loader /> Checking...</> : <>{step === 3 ? 'Review request' : 'Continue'} <ArrowRight size={17} /></>}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>
      </PageContainer>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={discard} />
    </AppShell>
  )
}
