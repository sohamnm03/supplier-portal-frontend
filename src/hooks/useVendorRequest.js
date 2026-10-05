import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vendorRequestSchema } from '../schemas/vendorRequestSchema'
import { DEFAULT_COUNTRY_CODE } from '../data/countryCodes'

const defaults = {
  vendorLegalName: '', vendorPhoneCode: DEFAULT_COUNTRY_CODE, vendorPhone: '', vendorEmail: '', vendorType: '', yearEstablished: '', currency: 'INR', registrationNumber: '', msmeStatus: 'Not registered', assignedRm: '', udyamNumber: '',
  registeredAddress1: '', registeredCity: '', registeredDistrict: '', registeredState: '', registeredPostalCode: '',
  pan: '', gstin: '', aadhaar: '', cin: '',
  accountHolderName: '', bankName: '', branchName: '', accountNumber: '', ifsc: '',
  accurateDeclaration: false, termsDeclaration: false,
}

// PAN / email values the server has said already belong to a vendor. The duplicate check hooks
// record them here, and the resolver below keeps reporting them as errors, so the message stays for as
// long as the taken value is in the field. (A plain manual error is wiped the moment the field is
// validated again - e.g. when you click out of it - which is why it used to disappear after a few seconds.)
const TAKEN_RULES = [
  ['pan', 'This PAN already exists.', (value) => String(value ?? '').trim().toUpperCase()],
  ['vendorEmail', 'This email already exists.', (value) => String(value ?? '').trim().toLowerCase()],
]

export default function useVendorRequest() {
  const takenRef = useRef({ pan: '', vendorEmail: '' })
  const schemaResolver = useRef(zodResolver(vendorRequestSchema)).current

  const resolver = async (values, context, options) => {
    const result = await schemaResolver(values, context, options)
    const errors = { ...(result.errors || {}) }
    let found = false
    TAKEN_RULES.forEach(([field, message, normalise]) => {
      const taken = takenRef.current[field]
      if (taken && normalise(values[field]) === normalise(taken)) {
        errors[field] = { type: 'duplicate', message: takenRef.current[`${field}Message`] || message }
        found = true
      }
    })
    return found ? { values: {}, errors } : result
  }

  const form = useForm({ resolver, defaultValues: defaults, mode: 'onTouched', shouldUnregister: false })
  return { ...form, takenRef }
}
