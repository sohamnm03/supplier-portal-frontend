import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, FileCheck2, Landmark, Save, Send, ShieldCheck, X } from 'lucide-react'
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
import { FORM_STEPS, STEP_FIELDS } from '../utils/constants'
import { clearDraft, saveDraft } from '../utils/storage'
import { createVendor } from '../api/vendorApi'

const trustPoints = [
  { icon: ShieldCheck, label: 'Secure verification' },
  { icon: FileCheck2, label: 'Invoice-ready profile' },
  { icon: Landmark, label: 'Bank detail validation' },
]

export default function VendorRequestPage() {
  const navigate = useNavigate()
  const form = useVendorRequest()
  const { register, watch, setValue, trigger, reset, handleSubmit, formState: { errors } } = form
  const [step, setStep] = useState(1)
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const values = watch()
  const currentFields = STEP_FIELDS[step - 1] || []
  const errorCount = currentFields.filter((name) => errors[name]).length
  const declarationsComplete = values.accurateDeclaration && values.reviewedDeclaration && values.termsDeclaration && values.consentDeclaration

  const nextStep = async () => {
    setAttempted(true)
    const valid = await trigger(currentFields, { shouldFocus: true })
    if (!valid) return
    setAttempted(false)
    setStep((current) => Math.min(current + 1, 4))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const previousStep = () => {
    setAttempted(false)
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = () => {
    setSaving(true)
    saveDraft(values)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 450)
  }

  const submitRequest = handleSubmit(async (data) => {
    if (!declarationsComplete) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const vendor = await createVendor(data)
      clearDraft()
      navigate('/request-success', {
        state: {
          requestId: `VR-${vendor.vendor_id}`,
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
    setCancelOpen(false)
    navigate('/')
  }

  const renderStep = () => {
    const props = { register, errors, watch, setValue }
    if (step === 1) return <VendorInformation {...props} />
    if (step === 2) return <AddressAndTaxDetails {...props} />
    if (step === 3) return <BankDetails {...props} />
    return <ReviewRequest values={values} register={register} errors={errors} onEdit={(target) => setStep(target)} />
  }

  return (
    <AppShell breadcrumb="New Vendor Request">
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
                <p className="eyebrow">Secure vendor access</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy-950 sm:text-2xl">Request vendor account</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">{FORM_STEPS[step - 1].longTitle} · Fields marked with an asterisk are required.</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Secure form
              </span>
            </header>

            <FormProgress currentStep={step} />
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitRequest} noValidate>
              {attempted && <FormError count={errorCount} />}
              {submitError && (
                <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <span className="font-semibold">Submission failed.</span> {submitError}
                </div>
              )}

              {renderStep()}

              <div className="z-20 mt-3 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_-4px_18px_rgba(16,42,76,0.05)] sm:p-2.5">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="ghost" onClick={() => setCancelOpen(true)}><X size={17} /> Cancel</Button>
                    <Button type="button" variant="secondary" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader /> : saved ? <CheckCircle2 size={17} /> : <Save size={17} />}
                      {saving ? 'Saving…' : saved ? 'Draft saved' : 'Save draft'}
                    </Button>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    {step > 1 && <Button type="button" variant="secondary" onClick={previousStep}><ArrowLeft size={17} /> Back</Button>}
                    {step < 4 ? (
                      <Button type="button" onClick={nextStep}>{step === 3 ? 'Review request' : 'Continue'} <ArrowRight size={17} /></Button>
                    ) : (
                      <Button type="submit" disabled={!declarationsComplete || submitting}>
                        {submitting ? <><Loader /> Submitting…</> : <><Send size={17} /> Submit request</>}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </section>
      </PageContainer>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={discard} />
    </AppShell>
  )
}
