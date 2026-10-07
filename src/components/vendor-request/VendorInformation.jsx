import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Building2, Lock, Search } from 'lucide-react'
import Input from '../common/Input'
import AadhaarInput from '../common/AadhaarInput'
import SelectMenu from '../common/SelectMenu'
import FormSection from './FormSection'
import Loader from '../common/Loader'
import { currencies, relationshipManagers } from '../../data/mockData'
import { checkPanExists, lookupPincode, verifyGstin } from '../../api/vendorApi'
import useDuplicateCheck from '../../hooks/useDuplicateCheck'
import { PIN_PATTERN } from '../../hooks/usePincodeAutofill'

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export default function VendorInformation({ register, errors, watch, setValue, setError, clearErrors, lockedFields = [], disabled = false, onGstLookupSuccess, onPanTakenChange, onPanCheckingChange, takenRef }) {
  const msmeStatus = watch('msmeStatus')
  const pan = watch('pan')?.trim().toUpperCase() || ''
  const gstin = watch('gstin')?.trim().toUpperCase() || ''
  const [gstLookup, setGstLookup] = useState({ loading: false, gstin: '', message: '' })
  // gstLookup.gstin is only set by a successful lookup, and cleared again if the GSTIN is changed.
  const gstVerified = Boolean(gstLookup.gstin) && gstLookup.gstin === gstin

  // City and District come from the GSTIN's PIN code, right after the lookup rather than once the vendor reaches the
  // address step. They stay editable. A failed PIN lookup is silent: the address step retries it and tells the vendor.
  const cityLookupToken = useRef(0)
  const fillCityAndDistrict = async (pincode, token) => {
    if (!PIN_PATTERN.test(pincode)) return
    try {
      const place = await lookupPincode(pincode)
      if (!place || token !== cityLookupToken.current) return
      setValue('registeredCity', place.city, { shouldDirty: true, shouldValidate: true })
      setValue('registeredDistrict', place.district, { shouldDirty: true, shouldValidate: true })
    } catch {
      // Nothing to do: see above.
    }
  }

  const handleGstLookup = async () => {
    if (!GSTIN_PATTERN.test(gstin)) {
      setError('gstin', { type: 'manual', message: 'Enter a valid 15-character GSTIN before verifying.' })
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
      fillCityAndDistrict(postalCode, ++cityLookupToken.current)
    } catch (lookupError) {
      const message = lookupError?.message || 'GSTIN verification failed. Please try again.'
      setError('gstin', { type: 'manual', message })
      setGstLookup({ loading: false, gstin: '', message: '' })
    }
  }

  // The legal name and address were filled from one GSTIN. Change or remove that GSTIN and they no longer
  // belong to it, so they are cleared (to be filled again by a lookup of the new GSTIN).
  useEffect(() => {
    if (!gstLookup.gstin || gstLookup.gstin === gstin) return
    cityLookupToken.current += 1 // a PIN lookup still in flight belongs to the old GSTIN
    ;['vendorLegalName', 'registeredAddress1', 'registeredCity', 'registeredDistrict', 'registeredState', 'registeredPostalCode'].forEach((name) => setValue(name, '', { shouldDirty: true }))
    setGstLookup({ loading: false, gstin: '', message: '' })
  }, [gstin, gstLookup.gstin, setValue])

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
    takenRef,
  })

  return (
    <FormSection icon={Building2} title="Vendor information" description="Provide the vendor’s legal and commercial profile.">
      {disabled && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <Lock size={14} className="shrink-0" />
          Verify your email and enter a valid phone number above to fill in the vendor information.
        </p>
      )}
      {/* A disabled fieldset disables every native control inside it, including the custom selects. */}
      {/* Three columns from tablet width up, so the rows read: GSTIN + legal name / PAN, Aadhaar, registration no. /
          type, year, currency / MSME, Udyam, relationship manager. */}
      <fieldset disabled={disabled} className={`grid min-w-0 gap-x-3.5 gap-y-3 transition-opacity md:grid-cols-3 ${disabled ? 'opacity-50' : ''}`}>
        <Input
          label="GSTIN"
          name="gstin"
          register={register}
          error={errors.gstin}
          hint={gstLookup.gstin === gstin && gstLookup.message ? gstLookup.message : '15-character GST identification number, if applicable'}
          locked={lockedFields.includes('gstin')}
          action={gstVerified ? (
            <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
              <BadgeCheck size={14} /> Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={handleGstLookup}
              disabled={gstLookup.loading || !gstin}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 text-xs font-bold text-brand-700 transition hover:border-brand-500 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Verify GSTIN"
            >
              {gstLookup.loading ? <Loader /> : <Search size={14} />}
              Verify
            </button>
          )}
        />
        <Input
          className="md:col-span-2"
          label="Vendor legal name"
          name="vendorLegalName"
          register={register}
          error={errors.vendorLegalName}
          hint={lockedFields.includes('vendorLegalName') ? 'Filled automatically from GSTIN verification' : undefined}
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
        <AadhaarInput
          label="Aadhaar number"
          name="aadhaar"
          register={register}
          error={errors.aadhaar}
          hint="12-digit Aadhaar number, if applicable"
        />
        <Input
          label="Company registration number"
          name="registrationNumber"
          register={register}
          error={errors.registrationNumber}
          required
        />
        <SelectMenu
          label="Vendor type"
          name="vendorType"
          register={register}
          watch={watch}
          setValue={setValue}
          error={errors.vendorType}
          options={['Individual', 'Proprietorship', 'Partnership', 'Private limited company', 'Public limited company', 'Government entity', 'Other']}
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
        <SelectMenu
          label="Transaction currency"
          name="currency"
          register={register}
          watch={watch}
          setValue={setValue}
          error={errors.currency}
          options={currencies}
          required
        />
        <SelectMenu
          label="MSME status"
          name="msmeStatus"
          register={register}
          watch={watch}
          setValue={setValue}
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
        <SelectMenu
          label="Relationship manager"
          name="assignedRm"
          register={register}
          watch={watch}
          setValue={setValue}
          error={errors.assignedRm}
          options={relationshipManagers}
          placeholder="Select RM"
        />
      </fieldset>
    </FormSection>
  )
}
