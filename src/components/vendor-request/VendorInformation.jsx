import { useState } from 'react'
import { Building2, Search } from 'lucide-react'
import Input from '../common/Input'
import Select from '../common/Select'
import FormSection from './FormSection'
import Loader from '../common/Loader'
import { currencies, vendorCategories, vendorSubcategories } from '../../data/mockData'
import { checkEmailExists, checkPanExists, verifyGstin } from '../../api/vendorApi'
import useDuplicateCheck from '../../hooks/useDuplicateCheck'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export default function VendorInformation({ register, errors, watch, setValue, setError, clearErrors, lockedFields = [], onGstLookupSuccess, onEmailTakenChange, onPanTakenChange, onEmailCheckingChange, onPanCheckingChange }) {
  const category = watch('vendorCategory')
  const msmeStatus = watch('msmeStatus')
  const vendorEmail = watch('vendorEmail')?.trim() || ''
  const pan = watch('pan')?.trim().toUpperCase() || ''
  const gstin = watch('gstin')?.trim().toUpperCase() || ''
  const [gstLookup, setGstLookup] = useState({ loading: false, gstin: '', message: '' })

  const handleGstLookup = async () => {
    if (!GSTIN_PATTERN.test(gstin)) {
      setError('gstin', { type: 'manual', message: 'Enter a valid 15-character GSTIN before lookup.' })
      return
    }

    setGstLookup({ loading: true, gstin: '', message: '' })
    clearErrors('gstin')

    try {
      const result = await verifyGstin(gstin)
      const details = result.data
      const address = [details.addrBnm, details.addrBno, details.addrSt, details.addrLoc]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ')

      const verifiedGstin = result.gstin || details.gstin || gstin
      const legalName = details.tradeName || details.legalName || ''
      const state = details.stateCode || ''
      const postalCode = String(details.addrPncd || '')
      const appliedFields = ['gstin']

      setValue('gstin', verifiedGstin, { shouldDirty: true, shouldValidate: true })
      if (legalName) {
        setValue('vendorLegalName', legalName, { shouldDirty: true, shouldValidate: true })
        appliedFields.push('vendorLegalName')
      }
      if (address) {
        setValue('registeredAddress1', address, { shouldDirty: true, shouldValidate: true })
        appliedFields.push('registeredAddress1')
      }
      if (state) {
        setValue('registeredState', state, { shouldDirty: true, shouldValidate: true })
        appliedFields.push('registeredState')
      }
      if (postalCode) {
        setValue('registeredPostalCode', postalCode, { shouldDirty: true, shouldValidate: true })
        appliedFields.push('registeredPostalCode')
      }
      clearErrors(['gstin', 'vendorLegalName', 'registeredAddress1', 'registeredState', 'registeredPostalCode'])
      onGstLookupSuccess?.(appliedFields)
      setGstLookup({ loading: false, gstin: verifiedGstin, message: result.message || 'GSTIN details applied. Verified fields are locked.' })
    } catch (lookupError) {
      const message = lookupError?.message || 'GSTIN lookup failed. Please try again.'
      setError('gstin', { type: 'manual', message })
      setGstLookup({ loading: false, gstin: '', message: '' })
    }
  }

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
  })

  const checkingPan = useDuplicateCheck({
    value: pan,
    isValid: PAN_PATTERN.test(pan),
    checkFn: checkPanExists,
    message: 'This PAN already exists.',
    fieldName: 'pan',
    setError,
    clearErrors,
    onTakenChange: onPanTakenChange,
    onCheckingChange: onPanCheckingChange,
  })

  return (
    <FormSection icon={Building2} title="Vendor information" description="Provide the vendor’s legal and commercial profile.">
      <div className="form-grid">
        <Input
          label="GSTIN"
          name="gstin"
          register={register}
          error={errors.gstin}
          hint={gstLookup.gstin === gstin && gstLookup.message ? gstLookup.message : '15-character GST identification number, if applicable'}
          locked={lockedFields.includes('gstin')}
          action={(
            <button
              type="button"
              onClick={handleGstLookup}
              disabled={gstLookup.loading || !gstin}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 text-xs font-bold text-brand-700 transition hover:border-brand-500 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Look up GSTIN details"
            >
              {gstLookup.loading ? <Loader /> : <Search size={14} />}
              Lookup
            </button>
          )}
        />
        <Input
          label="Vendor legal name"
          name="vendorLegalName"
          register={register}
          error={errors.vendorLegalName}
          hint={lockedFields.includes('vendorLegalName') ? 'Filled automatically from GSTIN lookup' : undefined}
          locked={lockedFields.includes('vendorLegalName')}
          required
        />
        <Input
          label="PAN"
          name="pan"
          register={register}
          error={errors.pan}
          hint={checkingPan ? 'Checking availability…' : 'Format: ABCDE1234F'}
          required
        />
        <Input
          label="Aadhaar number"
          name="aadhaar"
          register={register}
          error={errors.aadhaar}
          hint="12-digit Aadhaar number, if applicable"
        />
        <Input
          label="Phone number"
          name="vendorPhone"
          type="tel"
          inputMode="tel"
          register={register}
          error={errors.vendorPhone}
          hint="10-digit mobile number"
          required
        />
        <Input
          label="Email address"
          name="vendorEmail"
          type="email"
          register={register}
          error={errors.vendorEmail}
          hint={checkingEmail ? 'Checking availability…' : undefined}
          required
        />
        <Select
          label="Vendor type"
          name="vendorType"
          register={register}
          error={errors.vendorType}
          options={['Individual', 'Proprietorship', 'Partnership', 'Private limited company', 'Public limited company', 'Government entity', 'Other']}
          required
        />
        <Select
          label="Vendor category"
          name="vendorCategory"
          register={register}
          error={errors.vendorCategory}
          options={vendorCategories}
          required
        />
        <Select
          label="Vendor subcategory"
          name="vendorSubcategory"
          register={register}
          error={errors.vendorSubcategory}
          options={vendorSubcategories[category] || []}
          required
        />
        <Input
          label="Year established"
          name="yearEstablished"
          inputMode="numeric"
          register={register}
          error={errors.yearEstablished}
          placeholder="2014"
        />
        <Select
          label="Transaction currency"
          name="currency"
          register={register}
          error={errors.currency}
          options={currencies}
          required
        />
        <Input
          label="Company registration number"
          name="registrationNumber"
          register={register}
          error={errors.registrationNumber}
          required
        />
        <Select
          label="MSME status"
          name="msmeStatus"
          register={register}
          error={errors.msmeStatus}
          options={['Registered', 'Not registered', 'Not applicable']}
          required
        />
        {msmeStatus === 'Registered' && (
          <Input
            label="MSME / Udyam registration number"
            name="udyamNumber"
            register={register}
            error={errors.udyamNumber}
            required
          />
        )}
      </div>
    </FormSection>
  )
}
