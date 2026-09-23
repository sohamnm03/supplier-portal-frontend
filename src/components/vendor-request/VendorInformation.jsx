import { Building2 } from 'lucide-react'
import Input from '../common/Input'
import Select from '../common/Select'
import FormSection from './FormSection'
import { currencies, vendorCategories, vendorSubcategories } from '../../data/mockData'
import { checkEmailExists, checkPanExists } from '../../api/vendorApi'
import useDuplicateCheck from '../../hooks/useDuplicateCheck'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export default function VendorInformation({ register, errors, watch, setError, clearErrors, onEmailTakenChange, onPanTakenChange, onEmailCheckingChange, onPanCheckingChange }) {
  const category = watch('vendorCategory')
  const msmeStatus = watch('msmeStatus')
  const vendorEmail = watch('vendorEmail')?.trim() || ''
  const pan = watch('pan')?.trim().toUpperCase() || ''

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
          hint="15-character GST identification number, if applicable"
        />
        <Input label="Vendor legal name" name="vendorLegalName" register={register} error={errors.vendorLegalName} required />
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
