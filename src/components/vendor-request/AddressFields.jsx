import Input from '../common/Input'
import Select from '../common/Select'
import { indianStates } from '../../data/mockData'

export default function AddressFields({ prefix, register, errors }) {
  return (
    <div className="form-grid">
      <Input
        className="wide"
        label="Address line 1"
        name={`${prefix}Address1`}
        register={register}
        error={errors[`${prefix}Address1`]}
        required
      />
      <Input
        label="City"
        name={`${prefix}City`}
        register={register}
        error={errors[`${prefix}City`]}
        required
      />
      <Input
        label="District / County"
        name={`${prefix}District`}
        register={register}
        error={errors[`${prefix}District`]}
        required
      />
      <Select
        label="State"
        name={`${prefix}State`}
        register={register}
        error={errors[`${prefix}State`]}
        options={indianStates}
        required
      />
      <Input
        label="Postal / PIN code"
        name={`${prefix}PostalCode`}
        register={register}
        error={errors[`${prefix}PostalCode`]}
        inputMode="numeric"
        required
      />
    </div>
  )
}
