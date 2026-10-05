import Input from '../common/Input'
import Select from '../common/Select'
import { indianStates } from '../../data/mockData'
import usePincodeAutofill, { pincodeStatusHint } from '../../hooks/usePincodeAutofill'

export default function AddressFields({ prefix, register, errors, watch, setValue, lockedFields = [] }) {
  const cityName = `${prefix}City`
  const districtName = `${prefix}District`
  const postalName = `${prefix}PostalCode`

  // City and District are filled in from the PIN code, but stay editable.
  const pincodeStatus = usePincodeAutofill({
    pincode: String(watch(postalName) ?? '').trim(),
    getCurrent: () => ({ city: watch(cityName), district: watch(districtName) }),
    apply: ({ city, district }) => {
      if (city) setValue(cityName, city, { shouldDirty: true, shouldValidate: true })
      if (district) setValue(districtName, district, { shouldDirty: true, shouldValidate: true })
    },
  })

  return (
    <div className="form-grid">
      <Input
        className="wide"
        label="Address line 1"
        name={`${prefix}Address1`}
        register={register}
        error={errors[`${prefix}Address1`]}
        hint={lockedFields.includes(`${prefix}Address1`) ? 'Filled automatically from GSTIN lookup' : undefined}
        locked={lockedFields.includes(`${prefix}Address1`)}
        required
      />
      <Input
        label="City"
        name={cityName}
        register={register}
        error={errors[cityName]}
        required
      />
      <Input
        label="District / County"
        name={districtName}
        register={register}
        error={errors[districtName]}
        required
      />
      <Select
        label="State"
        name={`${prefix}State`}
        register={register}
        error={errors[`${prefix}State`]}
        options={indianStates}
        locked={lockedFields.includes(`${prefix}State`)}
        required
      />
      <Input
        label="Postal / PIN code"
        name={postalName}
        register={register}
        error={errors[postalName]}
        inputMode="numeric"
        hint={pincodeStatusHint[pincodeStatus] || (lockedFields.includes(postalName) ? 'Filled automatically from GSTIN lookup' : 'City and district fill in from the PIN code')}
        locked={lockedFields.includes(postalName)}
        required
      />
    </div>
  )
}
