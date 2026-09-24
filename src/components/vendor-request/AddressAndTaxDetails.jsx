import { MapPin, Receipt } from 'lucide-react'
import Input from '../common/Input'
import FormSection from './FormSection'
import AddressFields from './AddressFields'

export default function AddressAndTaxDetails({ register, errors, watch, lockedFields = [] }) {
  const vendorType = watch('vendorType')
  const showCin = ['Private limited company', 'Public limited company'].includes(vendorType)

  return (
    <div className="space-y-3">
      <FormSection
        icon={MapPin}
        title="Registered address"
        description="Enter the address shown on the vendor’s official registration."
      >
        <AddressFields prefix="registered" register={register} errors={errors} lockedFields={lockedFields} />
      </FormSection>
      {showCin && (
        <FormSection
          icon={Receipt}
          title="Compliance information"
          description="Additional registration details required for incorporated entities."
        >
          <div className="form-grid">
            <Input label="CIN" name="cin" register={register} error={errors.cin} />
          </div>
        </FormSection>
      )}
    </div>
  )
}
